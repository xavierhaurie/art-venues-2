// Venue-related types for Epic B

export type VenueType =
  | 'gallery - commercial'
  | 'gallery - non-profit'
  | 'library'
  | 'cafe-restaurant'
  | 'association'
  | 'market'
  | 'store'
  | 'online'
  | 'open studios'
  | 'public art'
  | 'other';

export interface Venue {
  id: string;
  region_code: 'BOS' | 'LA' | 'NYC';
  name: string;
  type: VenueType;
  website_url?: string;
  locality: string;
  address?: string;
  public_transit?: 'yes' | 'partial' | 'no';
  map_link?: string;
  artist_summary?: string;
  visitor_summary?: string;
  facebook?: string;
  instagram?: string;
  claim_status: 'unclaimed' | 'pending' | 'claimed' | 'rejected';
  claimed_by_user_id?: string;
  normalized_url: string;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
  user_note?: {
    id: string;
    body: string;
  } | null;
  user_stickers?: Array<{
    id: string;
    sticker_meaning_id: string;
    color: string;
    label: string;
    details: string | null;
  }>;
  // New: preloaded artwork thumbnails and count for this venue (current artist)
  images?: Array<{ id: string; url: string; created_at: string }>;
  images_count?: number;
}

export interface VenueListParams {
  page?: number;
  page_size?: number;
  localities?: string[]; // filter by multiple localities
  types?: string[]; // filter by multiple venue types
  public_transit?: 'yes' | 'partial' | 'no';
  transit_known?: boolean; // filter where public_transit is known (not null)
  has_open_call?: boolean;
  sort?: 'name' | 'locality';
  sort_order?: 'asc' | 'desc';
  q?: string; // search query
  sticker_ids?: string[]; // filter by sticker meaning IDs
}

export interface VenueListResponse {
  venues: Venue[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface VenueSearchHighlight {
  field: 'name' | 'artist_summary' | 'visitor_summary';
  snippet: string;
  highlights: Array<{
    start: number;
    end: number;
  }>;
}

export interface VenueFilters {
  localities: string[];
  types: VenueType[];
  public_transit_options: Array<'yes' | 'partial' | 'no'>;
}
