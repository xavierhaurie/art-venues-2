import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/venues/export
 * Export venues with user interactions (notes, stickers, or images) as CSV
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch venues where the user has any interaction:
    // - Has notes (note table)
    // - Has stickers (sticker_assignment table)
    // - Has images (venue_image table)

    // Use a query that gets venues with any of these interactions
    const { data: venuesWithNotes, error: notesError } = await supabase
      .from('note')
      .select('venue_id')
      .eq('artist_user_id', userId);

    const { data: venuesWithStickers, error: stickersError } = await supabase
      .from('sticker_assignment')
      .select('venue_id')
      .eq('artist_user_id', userId);

    const { data: venuesWithImages, error: imagesError } = await supabase
      .from('venue_image')
      .select('venue_id')
      .eq('artist_user_id', userId);

    if (notesError || stickersError || imagesError) {
      throw new Error('Failed to fetch user interactions');
    }

    // Collect unique venue IDs
    const venueIds = new Set<string>();
    (venuesWithNotes || []).forEach(v => venueIds.add(v.venue_id));
    (venuesWithStickers || []).forEach(v => venueIds.add(v.venue_id));
    (venuesWithImages || []).forEach(v => venueIds.add(v.venue_id));

    if (venueIds.size === 0) {
      return NextResponse.json({
        error: 'No venues found with interactions',
        message: 'You haven\'t added any notes, stickers, or images to venues yet.'
      }, { status: 404 });
    }

    const venueIdArray = Array.from(venueIds);

    // Fetch full venue details
    const { data: venues, error: venuesError } = await supabase
      .from('venue')
      .select('id, name, website_url, address, public_transit')
      .in('id', venueIdArray)
      .order('name');

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`);
    }

    // Fetch notes for these venues
    const { data: notes, error: notesDetailError } = await supabase
      .from('note')
      .select('venue_id, body')
      .eq('artist_user_id', userId)
      .in('venue_id', venueIdArray);

    if (notesDetailError) {
      throw new Error(`Failed to fetch notes: ${notesDetailError.message}`);
    }

    // Fetch stickers for these venues
    const { data: stickers, error: stickersDetailError } = await supabase
      .from('sticker_assignment')
      .select(`
        venue_id,
        sticker_meaning_id,
        sticker_meaning!inner (
          id,
          label,
          color,
          details
        )
      `)
      .eq('artist_user_id', userId)
      .in('venue_id', venueIdArray);

    if (stickersDetailError) {
      throw new Error(`Failed to fetch stickers: ${stickersDetailError.message}`);
    }

    // Fetch image counts for these venues
    const { data: imageCounts, error: imageCountError } = await supabase
      .from('venue_image')
      .select('venue_id')
      .eq('artist_user_id', userId)
      .in('venue_id', venueIdArray);

    if (imageCountError) {
      throw new Error(`Failed to fetch image counts: ${imageCountError.message}`);
    }

    // Build lookup maps
    const notesMap = new Map<string, string>();
    (notes || []).forEach(n => notesMap.set(n.venue_id, n.body));

    const stickersMap = new Map<string, string[]>();
    (stickers || []).forEach((s: any) => {
      const labels = stickersMap.get(s.venue_id) || [];
      labels.push(s.sticker_meaning.label);
      stickersMap.set(s.venue_id, labels);
    });

    const imageCountsMap = new Map<string, number>();
    (imageCounts || []).forEach(img => {
      imageCountsMap.set(img.venue_id, (imageCountsMap.get(img.venue_id) || 0) + 1);
    });

    // Generate CSV content
    const csvRows: string[] = [];

    // Header row
    csvRows.push('Venue Name,Website URL,Stickers,Notes,Image Count,Address,Public Transit');

    // Data rows
    (venues || []).forEach(venue => {
      const name = escapeCsvField(venue.name || '');
      const website = escapeCsvField(venue.website_url || '');
      const stickerLabels = stickersMap.get(venue.id) || [];
      const stickersStr = escapeCsvField(stickerLabels.join(' '));
      const notesStr = escapeCsvField(notesMap.get(venue.id) || '');
      const imageCount = imageCountsMap.get(venue.id) || 0;
      const address = escapeCsvField(venue.address || '');
      const publicTransit = escapeCsvField(venue.public_transit || '');

      csvRows.push(`${name},${website},${stickersStr},${notesStr},${imageCount},${address},${publicTransit}`);
    });

    const csvContent = csvRows.join('\n');

    // Return CSV response with appropriate headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="my-venues-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Venue export API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export venues',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Escape CSV field - wrap in quotes if contains comma, quote, or newline
 */
function escapeCsvField(value: string): string {
  if (!value) return '';

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export const dynamic = 'force-dynamic';
