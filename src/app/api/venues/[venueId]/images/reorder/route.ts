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
    const { imageIds } = body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 });
    }

    // Update display_order for each image
    const updates = imageIds.map((imageId, index) =>
      supabase
        .from('venue_image')
        .update({ display_order: index + 1 })
        .eq('id', imageId)
        .eq('artist_user_id', session.userId)
        .eq('venue_id', params.venueId)
    );

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Error updating image order:', errors);
      return NextResponse.json({ error: 'Failed to update image order' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in image reorder:', error);
    return NextResponse.json({ error: 'Failed to reorder images' }, { status: 500 });
  }
}

