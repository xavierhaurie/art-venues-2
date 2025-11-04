import { createClient } from '@supabase/supabase-js';
import { Venue, VenueListParams, VenueListResponse, VenueFilters, VenueType } from '@/types/venue';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * M0-VEN-01: Venue list API (paging, filters, sort)
 * AC: GET /venues supports page/page_size, filters: locality, type, public_transit,
 * has_open_call (stub false), sort by name/locality. p95 < 600ms @ 250 rows.
 */
export async function getVenues(params: VenueListParams, userId?: string): Promise<VenueListResponse> {
  const {
    page = 1,
    page_size = 25,
    locality,
    type,
    public_transit,
    has_open_call = false,
    sort = 'name',
    sort_order = 'asc',
  } = params;

  const offset = (page - 1) * page_size;

  // Build the select with LEFT JOIN to notes and sticker assignments
  const selectClause = userId
    ? `id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, 
       note(id, body, artist_user_id),
       sticker_assignment(id, sticker_meaning_id, artist_user_id, sticker_meaning(id, label, details, color))`
    : 'id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at';

  let query = supabase
    .from('venue')
    .select(selectClause, { count: 'exact' });

  // Apply filters
  if (locality) {
    query = query.eq('locality', locality);
  }

  if (type) {
    query = query.eq('type', type);
  }

  if (public_transit) {
    query = query.eq('public_transit', public_transit);
  }

  if (has_open_call) {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Apply sorting
  const sortColumn = sort === 'locality' ? 'locality' : 'name';
  query = query.order(sortColumn, { ascending: sort_order === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + page_size - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  // Transform the data to include notes and stickers in a flat structure
  const venues = (data || []).map((venue: any) => {
    const result: any = { ...venue };

    // Handle notes
    if (userId && venue.note && Array.isArray(venue.note)) {
      const userNote = venue.note.find((n: any) => n.artist_user_id === userId);
      result.user_note = userNote ? { id: userNote.id, body: userNote.body } : null;
    } else {
      result.user_note = null;
    }
    delete result.note;

    // Handle sticker assignments
    if (userId && venue.sticker_assignment && Array.isArray(venue.sticker_assignment)) {
      result.user_stickers = venue.sticker_assignment
        .filter((sa: any) => sa.artist_user_id === userId && sa.sticker_meaning)
        .map((sa: any) => ({
          id: sa.id,
          sticker_meaning_id: sa.sticker_meaning_id,
          color: sa.sticker_meaning.color,
          label: sa.sticker_meaning.label,
          details: sa.sticker_meaning.details
        }));
    } else {
      result.user_stickers = [];
    }
    delete result.sticker_assignment;

    return result;
  });

  const total = count || 0;
  const total_pages = Math.ceil(total / page_size);

  return {
    venues: venues as Venue[],
    total,
    page,
    page_size,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  };
}

/**
 * M0-VEN-02: Full-text search (name + summaries)
 * AC: Query param q searches FTS & trigram fallback; returns highlight snippets;
 * no SQL injection; index-only scans.
 */
export async function searchVenues(
  query: string,
  params: VenueListParams,
  userId?: string
): Promise<VenueListResponse> {
  const {
    page = 1,
    page_size = 25,
    locality,
    type,
    public_transit,
    sort = 'name',
    sort_order = 'asc',
  } = params;

  // Sanitize search query to prevent SQL injection
  const sanitizedQuery = query.trim().replace(/[^\w\s-]/g, '');

  if (!sanitizedQuery) {
    return getVenues(params, userId);
  }

  const offset = (page - 1) * page_size;

  // Build the select with LEFT JOIN to notes and sticker assignments
  const selectClause = userId
    ? `id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, 
       note(id, body, artist_user_id),
       sticker_assignment(id, sticker_meaning_id, artist_user_id, sticker_meaning(id, label, details, color))`
    : 'id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at';

  let searchQuery = supabase
    .from('venue')
    .select(selectClause, { count: 'exact' })
    .textSearch('search', sanitizedQuery, {
      type: 'websearch',
      config: 'english',
    });

  // Apply filters
  if (locality) {
    searchQuery = searchQuery.eq('locality', locality);
  }

  if (type) {
    searchQuery = searchQuery.eq('type', type);
  }

  if (public_transit) {
    searchQuery = searchQuery.eq('public_transit', public_transit);
  }

  // Apply sorting
  const sortColumn = sort === 'locality' ? 'locality' : 'name';
  searchQuery = searchQuery.order(sortColumn, { ascending: sort_order === 'asc' });

  // Apply pagination
  searchQuery = searchQuery.range(offset, offset + page_size - 1);

  const { data, error, count } = await searchQuery;

  if (error) {
    throw new Error(`Failed to search venues: ${error.message}`);
  }

  // Transform the data to include notes and stickers in a flat structure
  const venues = (data || []).map((venue: any) => {
    const result: any = { ...venue };

    // Handle notes
    if (userId && venue.note && Array.isArray(venue.note)) {
      const userNote = venue.note.find((n: any) => n.artist_user_id === userId);
      result.user_note = userNote ? { id: userNote.id, body: userNote.body } : null;
    } else {
      result.user_note = null;
    }
    delete result.note;

    // Handle sticker assignments
    if (userId && venue.sticker_assignment && Array.isArray(venue.sticker_assignment)) {
      result.user_stickers = venue.sticker_assignment
        .filter((sa: any) => sa.artist_user_id === userId && sa.sticker_meaning)
        .map((sa: any) => ({
          id: sa.id,
          sticker_meaning_id: sa.sticker_meaning_id,
          color: sa.sticker_meaning.color,
          label: sa.sticker_meaning.label,
          details: sa.sticker_meaning.details
        }));
    } else {
      result.user_stickers = [];
    }
    delete result.sticker_assignment;

    return result;
  });

  const total = count || 0;
  const total_pages = Math.ceil(total / page_size);

  return {
    venues: venues as Venue[],
    total,
    page,
    page_size,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  };
}

/**
 * Get available filter options for venue listing
 */
export async function getVenueFilters(region: string = 'BOS'): Promise<VenueFilters> {
  const { data: localityData, error: localityError } = await supabase
    .from('venue')
    .select('locality')
    .eq('region_code', region)
    .order('locality');

  if (localityError) {
    throw new Error(`Failed to fetch localities: ${localityError.message}`);
  }

  const localities = [...new Set(localityData?.map(v => v.locality) || [])];

  const { data: typeData, error: typeError } = await supabase
    .from('venue')
    .select('type')
    .eq('region_code', region)
    .order('type');

  if (typeError) {
    throw new Error(`Failed to fetch types: ${typeError.message}`);
  }

  const types = [...new Set(typeData?.map(v => v.type as VenueType) || [])];
  const public_transit_options: Array<'yes' | 'partial' | 'no'> = ['yes', 'partial', 'no'];

  return {
    localities,
    types,
    public_transit_options,
  };
}

/**
 * Get a single venue by ID
 */
export async function getVenueById(id: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venue')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch venue: ${error.message}`);
  }

  return data as Venue;
}

/**
 * Get a venue by normalized URL
 */
export async function getVenueByUrl(normalized_url: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venue')
    .select('*')
    .eq('normalized_url', normalized_url)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch venue: ${error.message}`);
  }

  return data as Venue;
}

