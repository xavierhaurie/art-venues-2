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
    const notes_present = searchParams.get('notes_present') === 'true';
    const show_public = searchParams.get('show_public') !== 'false'; // default true
    const show_mine = searchParams.get('show_mine') !== 'false';     // default true

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
      notes_present,
      show_public,
      show_mine,
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
 * POST /api/venues
 * Create a new venue (admin -> public; user -> user-owned)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type,
      region_code,
      locality,
      address,
      website_url,
      public_transit,
      map_link,
      artist_summary,
      visitor_summary,
      facebook,
      instagram,
      claim_status = 'unclaimed'
    } = body || {};

    // Basic validation
    const required = { name, type, region_code, locality, address, website_url };
    const missing = Object.entries(required).filter(([, v]) => !v || String(v).trim() === '').map(([k]) => k);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    // Normalize URL slug based on name (lowercase, dash-separated) as a fallback
    const normalized_url = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Use service-key supabase client via lib/venues createClient
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If non-admin user, enforce 20 venue limit and set owner to user
    let owner_user_id: string | null = null;
    const isAdmin = session.role === 'admin';
    if (!isAdmin) {
      owner_user_id = session.userId;
      const { count, error: cntErr } = await supabase
        .from('venue')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', owner_user_id);
      if (cntErr) {
        return NextResponse.json({ error: `Failed to validate limit: ${cntErr.message}` }, { status: 500 });
      }
      if ((count || 0) >= 20) {
        return NextResponse.json({ error: 'Venue limit reached (20). Please convert venues to public to add more.' }, { status: 400 });
      }
    }

    // Insert venue (public if admin, user-owned otherwise)
    const insertPayload: any = {
      name,
      type,
      website_url,
      region_code,
      locality,
      address,
      public_transit,
      map_link,
      artist_summary,
      visitor_summary,
      facebook,
      instagram,
      claim_status,
      normalized_url,
      owner_user_id,
    };

    const { data, error } = await supabase
      .from('venue')
      .insert(insertPayload)
      .select('id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, owner_user_id')
      .single();

    if (error) {
      return NextResponse.json({ error: `Failed to create venue: ${error.message}` }, { status: 400 });
    }

    // shape minimal response for list injection
    const created = {
      ...data,
      images: [],
      images_count: 0,
      user_note: null,
      user_stickers: [],
      user_owned: !!data.owner_user_id && data.owner_user_id === session.userId,
    };

    return NextResponse.json({ venue: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create venue', message: err?.message || String(err) }, { status: 500 });
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
