import { NextRequest, NextResponse } from 'next/server';
import { requireArtist } from '@/lib/rbac';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('venue_image')
      .select('*')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching venue images:', error);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    return NextResponse.json({ images: data || [] });
  } catch (error) {
    console.error('Error in venue images GET:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Check image count limit (20 max)
    const { data: existingImages } = await supabase
      .from('venue_image')
      .select('id')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId);

    if (existingImages && existingImages.length >= 20) {
      return NextResponse.json({ error: 'Maximum 20 images allowed per venue' }, { status: 400 });
    }

    // Get the highest display_order for this venue
    const { data: maxOrderData } = await supabase
      .from('venue_image')
      .select('display_order')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order + 1 : 1;

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.userId}/${params.venueId}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('venue-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('venue-images')
      .getPublicUrl(fileName);

    // Save image record to database
    const { data: imageData, error: dbError } = await supabase
      .from('venue_image')
      .insert({
        venue_id: params.venueId,
        artist_user_id: session.userId,
        file_path: fileName,
        url: publicUrl,
        title: title || null,
        display_order: nextOrder,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving image record:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('venue-images').remove([fileName]);
      return NextResponse.json({ error: 'Failed to save image record' }, { status: 500 });
    }

    return NextResponse.json({ image: imageData });
  } catch (error) {
    console.error('Error in venue images POST:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

