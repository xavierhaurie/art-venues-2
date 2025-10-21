// Venue-related types for Epic B

export interface Venue {
  id: string;
  region_code: 'BOS' | 'LA' | 'NYC';
  name: string;
  type: string;
  locality: string;
  lat?: number;
  lng?: number;
  mbta?: 'yes' | 'partial' | 'no';
  distance_km?: number;
  commission_pct?: number;
  fees?: string;
  insurance_req?: boolean;
  mediums: string[];
  website_url?: string;
  social: Record<string, any>;
  blurb?: string;
  claimed_by_user_id?: string;
  claim_status: 'unclaimed' | 'pending' | 'claimed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface VenueListParams {
  page?: number;
  page_size?: number;
  locality?: string;
  type?: string;
  mbta?: 'yes' | 'partial' | 'no';
  has_open_call?: boolean;
  sort?: 'name' | 'locality' | 'distance';
  sort_order?: 'asc' | 'desc';
  q?: string; // search query
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
  field: 'name' | 'blurb';
  snippet: string;
  highlights: Array<{
    start: number;
    end: number;
  }>;
}
