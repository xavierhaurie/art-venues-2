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
export async function getVenues(params: VenueListParams): Promise<VenueListResponse> {
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

  // Calculate offset for pagination
  const offset = (page - 1) * page_size;

  // Start building the query
  let query = supabase
    .from('venue')
    .select('*', { count: 'exact' });

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

  // Stub for has_open_call - will be implemented later
  // For now, we always filter to venues without open calls (none exist yet)
  if (has_open_call) {
    // This will return empty results until open calls are implemented
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Apply sorting
  const sortColumn = sort === 'locality' ? 'locality' : 'name';
  query = query.order(sortColumn, { ascending: sort_order === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + page_size - 1);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / page_size);

  return {
    venues: (data || []) as Venue[],
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
  params: VenueListParams
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
    // If query is empty after sanitization, fall back to regular listing
    return getVenues(params);
  }

  const offset = (page - 1) * page_size;

  // Use Supabase's textSearch for full-text search on the 'search' tsvector column
  let searchQuery = supabase
    .from('venue')
    .select('*', { count: 'exact' })
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

  const total = count || 0;
  const total_pages = Math.ceil(total / page_size);

  return {
    venues: (data || []) as Venue[],
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
 * Used to populate filter dropdowns in the UI
 */
export async function getVenueFilters(region: string = 'BOS'): Promise<VenueFilters> {
  // Get distinct localities for the region
  const { data: localityData, error: localityError } = await supabase
    .from('venue')
    .select('locality')
    .eq('region_code', region)
    .order('locality');

  if (localityError) {
    throw new Error(`Failed to fetch localities: ${localityError.message}`);
  }

  const localities = [...new Set(localityData?.map(v => v.locality) || [])];

  // Get distinct types
  const { data: typeData, error: typeError } = await supabase
    .from('venue')
    .select('type')
    .eq('region_code', region)
    .order('type');

  if (typeError) {
    throw new Error(`Failed to fetch types: ${typeError.message}`);
  }

  const types = [...new Set(typeData?.map(v => v.type as VenueType) || [])];

  // Public transit options are fixed
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
      // Not found
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
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch venue: ${error.message}`);
  }

  return data as Venue;
}
