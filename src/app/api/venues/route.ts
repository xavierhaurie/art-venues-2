import { NextRequest, NextResponse } from 'next/server';
import { getVenues, searchVenues, getVenueFilters } from '@/lib/venues';
import { VenueListParams } from '@/types/venue';
import { getSession } from '@/lib/session';

/**
 * GET /api/venues
 * List venues with paging, filters, and sorting
 * Includes user notes in the response via JOIN
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get current user session (if available)
    const session = await getSession();
    const userId = session?.userId;

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const page_size = Math.min(parseInt(searchParams.get('page_size') || '25', 10), 100); // Cap at 100

    // Parse filter parameters
    const localities_param = searchParams.get('localities');
    const localities = localities_param ? localities_param.split(',') : undefined;
    const types_param = searchParams.get('types');
    const types = types_param ? types_param.split(',') : undefined;
    const public_transit = searchParams.get('public_transit') as 'yes' | 'partial' | 'no' | undefined;
    const has_open_call = searchParams.get('has_open_call') === 'true';
    const transit_known = searchParams.get('transit_known') === 'true';
    const images_present = searchParams.get('images_present') === 'true';

    // Parse sticker filter parameter
    const sticker_ids_param = searchParams.get('sticker_ids');
    const sticker_ids = sticker_ids_param ? sticker_ids_param.split(',') : undefined;

    // Parse sorting parameters
    const sort = (searchParams.get('sort') || 'name') as 'name' | 'locality';
    const sort_order = (searchParams.get('sort_order') || 'asc') as 'asc' | 'desc';

    // Parse search query
    const q = searchParams.get('q') || undefined;

    const params: VenueListParams = {
      page,
      page_size,
      localities,
      types,
      public_transit,
      has_open_call,
      sort,
      sort_order,
      q,
      sticker_ids,
      transit_known,
      images_present,
    };

    // Use search function if query provided, otherwise use regular listing
    // Pass userId to include notes in the JOIN
    const result = q ? await searchVenues(q, params, userId) : await getVenues(params, userId);

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
