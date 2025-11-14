import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserId } from '/lib/session';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/venues/[venueId]
 * Fetch a single venue by ID with ALL fields (including contact info)
 * Used by the venue modal to get complete venue data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const { venueId } = params;

    if (!venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
    }

    // Get current user ID to determine ownership
    const currentUserId = await getCurrentUserId();

    // Select ALL fields including contact information
    const { data, error } = await supabase
      .from('venue')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
      }
      console.error('Error fetching venue:', error);
      return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
    }

    // Add user_owned boolean
    const venueWithOwnership = {
      ...data,
      user_owned: currentUserId ? data.owner_user_id === currentUserId : false
    };

    return NextResponse.json(venueWithOwnership);
  } catch (error) {
    console.error('Error in venue GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/venues/[venueId]
 * Update a user-owned venue
 * Only the owner can update their own venues
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venueId } = params;
    if (!venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
    }

    // Check if venue is owned by the user
    const { data: venue, error: fetchError } = await supabase
      .from('venue')
      .select('owner_user_id')
      .eq('id', venueId)
      .single();

    if (fetchError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    if (venue.owner_user_id !== userId) {
      return NextResponse.json({ error: 'You can only edit your own venues' }, { status: 403 });
    }

    // ...existing code...
    const body = await request.json();
    const {
      name,
      type,
      locality,
      region_code,
      address,
      website_url,
      public_transit,
      map_link,
      artist_summary,
      visitor_summary,
      facebook,
      instagram
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!type?.trim()) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }
    if (!locality?.trim()) {
      return NextResponse.json({ error: 'Locality is required' }, { status: 400 });
    }
    if (!region_code?.trim()) {
      return NextResponse.json({ error: 'Region code is required' }, { status: 400 });
    }
    if (!address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    if (!website_url?.trim()) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    // Update venue
    const { data: updatedVenue, error: updateError } = await supabase
      .from('venue')
      .update({
        name: name.trim(),
        type: type.trim(),
        locality: locality.trim(),
        region_code: region_code.trim(),
        address: address.trim(),
        website_url: website_url.trim(),
        public_transit: public_transit?.trim() || null,
        map_link: map_link?.trim() || null,
        artist_summary: artist_summary?.trim() || null,
        visitor_summary: visitor_summary?.trim() || null,
        facebook: facebook?.trim() || null,
        instagram: instagram?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', venueId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating venue:', updateError);
      return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 });
    }

    return NextResponse.json({ venue: updatedVenue }, { status: 200 });
  } catch (error) {
    console.error('Error in venue PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
