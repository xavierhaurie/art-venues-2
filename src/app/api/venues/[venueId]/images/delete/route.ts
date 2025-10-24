import { NextRequest, NextResponse } from 'next/server';
import { requireArtist } from '@/lib/rbac';
import { getSession } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }

    // Get the image to verify ownership and get file path
    const { data: image, error: fetchError } = await supabase
      .from('venue_image')
      .select('*')
      .eq('id', imageId)
      .eq('artist_user_id', session.userId)
      .eq('venue_id', params.venueId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found or access denied' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('venue-images')
      .remove([image.file_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('venue_image')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Error deleting image record:', dbError);
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in image delete:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

