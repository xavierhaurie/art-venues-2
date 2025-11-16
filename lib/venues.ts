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
    localities,
    types,
    public_transit,
    has_open_call = false,
    sort = 'name',
    sort_order = 'asc',
    sticker_ids,
    transit_known,
    images_present,
    notes_present,
  } = params;

  const offset = (page - 1) * page_size;

  // If sticker filtering is requested, we need to filter venues that have at least one of the selected stickers
  if (sticker_ids && sticker_ids.length > 0 && userId) {
    // First, get venue IDs that have any of the selected stickers for this user
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('sticker_assignment')
      .select('venue_id')
      .eq('artist_user_id', userId)
      .in('sticker_meaning_id', sticker_ids);

    if (assignmentError) {
      throw new Error(`Failed to fetch sticker assignments: ${assignmentError.message}`);
    }

    const venueIdsWithStickers = Array.from(new Set((assignmentData || []).map(a => a.venue_id)));

    if (venueIdsWithStickers.length === 0) {
      // No venues have the selected stickers, return empty result
      return {
        venues: [],
        total: 0,
        page,
        page_size,
        total_pages: 0,
        has_next: false,
        has_prev: false,
      };
    }

    const noteJoinSpec = notes_present && userId ? '!inner' : '!left';
    const imageJoinSpec = images_present && userId ? '!inner' : '!left';
    // Build the select with LEFT JOIN to notes and sticker assignments
    const selectClause = `id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, owner_user_id,
         note:note${noteJoinSpec}(id, body, artist_user_id),
         sticker_assignment(id, sticker_meaning_id, artist_user_id, sticker_meaning(id, label, details, color)),
         venue_image:venue_image${imageJoinSpec}(id, file_path, file_path_thumb, url, created_at, artist_user_id)`;

    let query = supabase
      .from('venue')
      .select(selectClause, { count: 'exact' })
      .in('id', venueIdsWithStickers);

    // Apply other filters
    if (localities && localities.length > 0) {
      query = query.in('locality', localities);
    }

    if (types && types.length > 0) {
      query = query.in('type', types);
    }

    if (public_transit) {
      query = query.eq('public_transit', public_transit);
    }
    if (transit_known) {
      query = query.not('public_transit', 'is', null);
    }
    if (has_open_call) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    // If images_present requested, filter to venues that have images for this user (related-table filter)
    if (images_present && userId) {
      query = query.eq('venue_image.artist_user_id', userId);
    }
    if (notes_present && userId) {
      query = query.eq('note.artist_user_id', userId);
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

    // Post-process to: filter venue_image to current user, sort by created_at desc, take top 6,
    // and create 10-minute signed URLs for thumbnails.
    const venues = await transformVenueDataWithImages(data || [], userId);

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

  // Original logic when no sticker filtering
  // Build the select with LEFT JOIN to notes and sticker assignments
  const noteJoin = notes_present && userId ? '!inner' : '!left';
  const imageJoin = images_present && userId ? '!inner' : '!left';
  const selectClause = userId
    ? `id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, owner_user_id,
       note:note${noteJoin}(id, body, artist_user_id),
       sticker_assignment(id, sticker_meaning_id, artist_user_id, sticker_meaning(id, label, details, color)),
       venue_image:venue_image${imageJoin}(id, file_path, file_path_thumb, url, created_at, artist_user_id)`
    : 'id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, owner_user_id';

  let query = supabase
    .from('venue')
    .select(selectClause, { count: 'exact' });

  // Apply filters
  if (localities && localities.length > 0) {
    query = query.in('locality', localities);
  }

  if (types && types.length > 0) {
    query = query.in('type', types);
  }

  if (public_transit) {
    query = query.eq('public_transit', public_transit);
  }
  if (transit_known) {
    query = query.not('public_transit', 'is', null);
  }
  if (has_open_call) {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Filter by images_present for the current user using related-table filter
  if (images_present && userId) {
    query = query.eq('venue_image.artist_user_id', userId);
  }
  if (notes_present && userId) {
    query = query.eq('note.artist_user_id', userId);
  }

  // Ownership filters: only include public (owner_user_id is null) and/or mine (owner_user_id == userId)
  // If both toggles are on, no restriction; if one off, apply restriction; if both off, force empty result.
  const showPublic = params.show_public !== false; // default true
  const showMine = params.show_mine !== false;     // default true
  if (!showPublic && !showMine) {
    return { venues: [], total: 0, page: params.page || 1, page_size: params.page_size || 25, total_pages: 0, has_next: false, has_prev: false };
  }
  if (userId) {
    if (showPublic && !showMine) {
      query = query.is('owner_user_id', null);
    } else if (!showPublic && showMine) {
      query = query.eq('owner_user_id', userId);
    } else {
      // both true -> no additional where clause (public or mine)
      // but exclude other users' owned venues
      query = query.or(`owner_user_id.is.null,owner_user_id.eq.${userId}`);
    }
  } else {
    // unauthenticated: only public venues
    query = query.is('owner_user_id', null);
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

  // Post-process to: filter venue_image to current user, sort by created_at desc, take top 6,
  // and create 10-minute signed URLs for thumbnails.
  const venues = await transformVenueDataWithImages(data || [], userId);

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

async function getSignedTtlSeconds(): Promise<number> {
  try {
    const { data, error } = await supabase.from('config').select('value').eq('name','signed_url_ttl_seconds').limit(1).single();
    if (error || !data) return 600;
    const raw = data.value;
    return /^[0-9.,]+$/.test(raw) ? Number(raw.replace(/,/g,'')) : 600;
  } catch { return 600; }
}
// Helper: create signed URLs for a list of storage paths
async function signUrls(paths: string[]): Promise<Record<string, string>> {
  const BUCKET = process.env.STORAGE_BUCKET_VENUE_IMAGES || 'artwork';
  const ttlSeconds = await getSignedTtlSeconds();
  const unique = Array.from(new Set(paths.filter(p => !!p && typeof p === 'string')));
  const out: Record<string, string> = {};

  // Sign concurrently for performance
  await Promise.all(unique.map(async (p) => {
    try {
      const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(p, ttlSeconds);
      if (!error && signed?.signedUrl) {
        out[p] = signed.signedUrl;
      } else if (error) {
        // Suppress noisy 404 for thumbnail variants; warn for other failures
        const isThumb = /thumb|_thumb|thumbnail/i.test(p);
        if (!(error as any).statusCode || (error as any).statusCode !== '404' || !isThumb) {
          console.warn('Signing URL failed:', p, error.message || error);
        }
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      const isThumb = /thumb|_thumb|thumbnail/i.test(p);
      if (!isThumb) {
        console.warn('Error creating signed URL:', p, msg);
      }
    }
  }));

  return out;
}

function transformVenueDataBase(data: any[], userId?: string): any[] {
  return data.map((venue: any) => {
    const result: any = { ...venue };
    if (userId) {
      result.user_owned = venue.owner_user_id === userId;
    } else {
      result.user_owned = false;
    }
    // Handle notes (support object or array from Supabase response)
    if (userId && venue.note) {
      const notesArr = Array.isArray(venue.note) ? venue.note : [venue.note];
      const userNote = notesArr.find((n: any) => n && n.artist_user_id === userId);
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
    delete result.owner_user_id;

    return result;
  });
}

async function transformVenueDataWithImages(data: any[], userId?: string): Promise<any[]> {
  const base = transformVenueDataBase(data, userId);

  if (!userId) {
    // No user scope; do not expose images
    return base.map(v => ({ ...v, images: [], images_count: 0 }));
  }

  // Build per-venue image arrays filtered by artist_user_id
  const pathsToSign: string[] = [];
  const byVenue = base.map((v: any) => {
    const imgs = Array.isArray((v as any).venue_image) ? (v as any).venue_image : [];
    const mine = imgs.filter((img: any) => img.artist_user_id === userId);
    // Newest first, cap 6
    mine.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const top = mine.slice(0, 6);
    top.forEach((img: any) => {
      if (img.file_path_thumb) pathsToSign.push(img.file_path_thumb);
      if (img.file_path) pathsToSign.push(img.file_path);
    });
    return { venue: v, mineAll: mine, top };
  });

  // Sign URLs for top images
  const signedMap = await signUrls(pathsToSign);

  return byVenue.map(({ venue, mineAll, top }) => {
    const images = top.map((img: any) => ({
      id: img.id,
      url: signedMap[img.file_path] || img.url || '',
      thumb_url: signedMap[img.file_path_thumb] || signedMap[img.file_path] || img.url || '',
      created_at: img.created_at
    }));
    const images_count = mineAll.length;
    const out = { ...venue, images, images_count };
    delete (out as any).venue_image;
    return out;
  });
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
    localities,
    types,
    public_transit,
    sort = 'name',
    sort_order = 'asc',
    images_present,
    notes_present,
  } = params;

  const sanitizedQuery = query.trim().replace(/[^\w\s-]/g, '');
  if (!sanitizedQuery) {
    return getVenues(params, userId);
  }

  const offset = (page - 1) * page_size;

  const noteJoinS = notes_present && userId ? '!inner' : '!left';
  const imageJoinS = images_present && userId ? '!inner' : '!left';
  const selectClause = userId
    ? `id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, owner_user_id,
       note:note${noteJoinS}(id, body, artist_user_id),
       sticker_assignment(id, sticker_meaning_id, artist_user_id, sticker_meaning(id, label, details, color)),
       venue_image:venue_image${imageJoinS}(id, file_path, file_path_thumb, url, created_at, artist_user_id)`
    : 'id, name, type, locality, region_code, public_transit, artist_summary, visitor_summary, created_at, owner_user_id';

  let searchQuery = supabase
    .from('venue')
    .select(selectClause, { count: 'exact' })
    .textSearch('search', sanitizedQuery, { type: 'websearch', config: 'english' });

  if (localities && localities.length > 0) searchQuery = searchQuery.in('locality', localities);
  if (types && types.length > 0) searchQuery = searchQuery.in('type', types);
  if (public_transit) searchQuery = searchQuery.eq('public_transit', public_transit);
  if (images_present && userId) {
    // Limit to venues that have images for this user via related-table filter
    searchQuery = searchQuery.eq('venue_image.artist_user_id', userId);
  }
  if (notes_present && userId) {
    searchQuery = searchQuery.eq('note.artist_user_id', userId);
  }

  // Ownership filters for search path
  const showPublic = params.show_public !== false;
  const showMine = params.show_mine !== false;
  if (!showPublic && !showMine) {
    return { venues: [], total: 0, page, page_size, total_pages: 0, has_next: false, has_prev: false };
  }
  if (userId) {
    if (showPublic && !showMine) {
      searchQuery = searchQuery.is('owner_user_id', null);
    } else if (!showPublic && showMine) {
      searchQuery = searchQuery.eq('owner_user_id', userId);
    } else {
      searchQuery = searchQuery.or(`owner_user_id.is.null,owner_user_id.eq.${userId}`);
    }
  } else {
    searchQuery = searchQuery.is('owner_user_id', null);
  }

  const sortColumn = sort === 'locality' ? 'locality' : 'name';
  searchQuery = searchQuery.order(sortColumn, { ascending: sort_order === 'asc' });
  searchQuery = searchQuery.range(offset, offset + page_size - 1);

  const { data, error, count } = await searchQuery;
  if (error) {
    throw new Error(`Failed to search venues: ${error.message}`);
  }

  const venues = await transformVenueDataWithImages(data || [], userId);
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
 * M0-VEN-03: Venue filters API
 * AC: GET /venue/filters returns distinct localities, types, and transit options for a region.
 */
export async function getVenueFilters(region: string): Promise<{ localities: string[]; types: string[]; transitOptions: string[] }> {
  // Fetch distinct locality and type values plus transit options from Supabase.
  // Using service-role client already defined above.
  const localityQuery = supabase.from('venue').select('locality').eq('region_code', region).not('locality','is', null);
  const typeQuery = supabase.from('venue').select('type').eq('region_code', region).not('type','is', null);
  const transitQuery = supabase.from('venue').select('public_transit').eq('region_code', region).not('public_transit','is', null);

  const [localitiesRes, typesRes, transitRes] = await Promise.all([localityQuery, typeQuery, transitQuery]);
  const localities = Array.from(new Set((localitiesRes.data || []).map(r => r.locality))).sort();
  const types = Array.from(new Set((typesRes.data || []).map(r => r.type))).sort();
  const transitOptions = Array.from(new Set((transitRes.data || []).map(r => r.public_transit))).sort();
  return { localities, types, transitOptions };
}
