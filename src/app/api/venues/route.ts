import { NextRequest, NextResponse } from 'next/server';
import { getVenues, searchVenues, getVenueFilters } from '@/lib/venues';
import { VenueListParams } from '@/types/venue';

/**
 * GET /api/venues
 * List venues with paging, filters, and sorting
 *
 * AC: GET /venues supports page/page_size, filters: locality, type, mbta,
 * has_open_call (stub false), sort by name/locality. p95 < 600ms @ 250 rows.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const page_size = Math.min(parseInt(searchParams.get('page_size') || '25', 10), 100); // Cap at 100

    // Parse filter parameters
    const locality = searchParams.get('locality') || undefined;
    const type = searchParams.get('type') || undefined;
    const mbta = searchParams.get('mbta') as 'yes' | 'partial' | 'no' | undefined;
    const has_open_call = searchParams.get('has_open_call') === 'true';

    // Parse sorting parameters
    const sort = (searchParams.get('sort') || 'name') as 'name' | 'locality' | 'distance';
    const sort_order = (searchParams.get('sort_order') || 'asc') as 'asc' | 'desc';

    // Parse search query
    const q = searchParams.get('q') || undefined;

    const params: VenueListParams = {
      page,
      page_size,
      locality,
      type,
      mbta,
      has_open_call,
      sort,
      sort_order,
      q,
    };

    // Use search function if query provided, otherwise use regular listing
    const result = q ? await searchVenues(q, params) : await getVenues(params);

    // Add performance timing header for monitoring p95 latency
    const responseHeaders = new Headers();
    responseHeaders.set('X-Response-Time', Date.now().toString());

    return NextResponse.json(result, { headers: responseHeaders });

  } catch (error) {
    console.error('Venue list API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch venues',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/venues/filters
 * Get available filter options for venue listing
 */
export async function OPTIONS(request: NextRequest) {
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
