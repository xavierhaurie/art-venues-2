import { NextRequest, NextResponse } from 'next/server';
import { requireArtist } from '@/lib/rbac';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/session';

const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true';

// Use service role key in dev bypass mode to skip RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  DEV_BYPASS_AUTH ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

    const BUCKET = process.env.STORAGE_BUCKET_VENUE_IMAGES || 'artwork';

    const { data, error } = await supabase
      .from('venue_image')
      .select('id, venue_id, artist_user_id, file_path, file_path_thumb, url, title, details, display_order, file_size, mime_type, created_at')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching venue images:', error);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    // Generate signed URLs for private bucket (valid for 10 minutes)
    const imagesWithSignedUrls = await Promise.all(
      (data || []).map(async (image) => {
        const { data: signedFull, error: errFull } = await supabase.storage.from(BUCKET).createSignedUrl(image.file_path, 600);
        const thumbPath = image.file_path_thumb || image.file_path;
        const { data: signedThumb, error: errThumb } = await supabase.storage.from(BUCKET).createSignedUrl(thumbPath, 600);

        if (errFull) console.error('Error creating full-size signed URL:', errFull);
        if (errThumb) console.error('Error creating thumb signed URL:', errThumb);
        return { ...image, url: signedFull?.signedUrl || image.url, thumb_url: signedThumb?.signedUrl || signedFull?.signedUrl || image.url };
      })
    );

    return NextResponse.json({ images: imagesWithSignedUrls });
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
    const BUCKET = process.env.STORAGE_BUCKET_VENUE_IMAGES || 'artwork';
    console.debug(`VenueImages POST: using storage bucket='${BUCKET}' for upload`);
    // Derive a safe file extension; fall back from mime type when necessary
    let fileExt = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : '';
    if (!fileExt) {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg+xml': 'svg'
      };
      fileExt = mimeToExt[file.type] || 'bin';
    }

    // Build a sanitized file name to avoid spaces and unsafe chars
    const safeTimestamp = Date.now();
    const sanitizedUserId = String(session.userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedVenueId = String(params.venueId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const basePath = `${sanitizedUserId}/${sanitizedVenueId}/${safeTimestamp}`;
    const fileName = `${basePath}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error(`Error uploading file to bucket='${BUCKET}':`, uploadError);
      const msg = uploadError?.message || JSON.stringify(uploadError);
      return NextResponse.json({ error: `Failed to upload file to bucket='${BUCKET}': ${msg}` }, { status: 500 });
    }

    // Create a 100px thumbnail variant client-side is not reliable on server routes; use same file for now or future transform function
    // Store thumb path equal to original path for now; you can later swap to a generated thumb path
    const thumbPath = `${basePath}.thumb.${fileExt}`;

    // Attempt to copy/transform to a thumb path if available (optional noop)
    // If your storage has an edge function to create thumbnails, invoke it here.
    // For now, we won't create a physical copy; we'll sign original for both but store thumb path for future backfill.

    // Save image record to database with thumb path
    const { data: imageData, error: dbError } = await supabase
      .from('venue_image')
      .insert({
        venue_id: params.venueId,
        artist_user_id: session.userId,
        file_path: fileName,
        file_path_thumb: thumbPath,
        url: fileName,
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
      await supabase.storage.from(BUCKET).remove([fileName]);
      const msg = dbError?.message || JSON.stringify(dbError);
      return NextResponse.json({ error: `Failed to save image record (bucket='${BUCKET}'): ${msg}` }, { status: 500 });
    }

    // Generate signed URLs (10 minutes)
    const { data: signedFull } = await supabase.storage.from(BUCKET).createSignedUrl(fileName, 600);
    const { data: signedThumb } = await supabase.storage.from(BUCKET).createSignedUrl(thumbPath, 600);

    const responseImage = {
      ...imageData,
      url: signedFull?.signedUrl || imageData.url,
      thumb_url: signedThumb?.signedUrl || signedFull?.signedUrl || imageData.url
    };

    return NextResponse.json({ image: responseImage });
  } catch (error) {
    console.error('Error in venue images POST:', error);
    const msg = (error as any)?.message || JSON.stringify(error);
    return NextResponse.json({ error: `Failed to upload image: ${msg}` }, { status: 500 });
  }
}
