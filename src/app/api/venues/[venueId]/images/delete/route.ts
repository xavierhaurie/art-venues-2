import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageId } = await request.json();
    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const BUCKET = process.env.STORAGE_BUCKET_VENUE_IMAGES || 'artwork';

    // 1. Get the image record to verify ownership and get file_path
    const { data: imageRecord, error: fetchError } = await supabase
      .from('venue_image')
      .select('file_path, artist_user_id')
      .eq('id', imageId)
      .eq('venue_id', params.venueId)
      .single();

    if (fetchError || !imageRecord) {
      console.error('Error fetching image record:', fetchError);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // 2. Verify user owns this image
    if (imageRecord.artist_user_id !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 3. Delete the image file from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([imageRecord.file_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue anyway - the file might already be deleted
    }

    // 4. Delete the database record
    const { error: dbError } = await supabase
      .from('venue_image')
      .delete()
      .eq('id', imageId)
      .eq('artist_user_id', session.userId);

    if (dbError) {
      console.error('Error deleting image record:', dbError);
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
