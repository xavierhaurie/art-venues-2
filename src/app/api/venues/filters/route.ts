import { NextRequest, NextResponse } from 'next/server';
import { getVenueFilters } from '/lib/venues';

/**
 * GET /api/venues/filters
 * Get available filter options for venue listing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'BOS';

    const filters = await getVenueFilters(region);

    return NextResponse.json(filters);

  } catch (error) {
    console.error('Venue filters API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch venue filters',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
