import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET /api/regions - returns all region rows (for title composition)
export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('region')
      .select('key, name')
      .order('name');

    if (error) {
      console.error('Failed to fetch regions:', error);
      return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
    }

    // Map to include id and code fields for compatibility
    const regions = Array.isArray(data)
      ? data.map(r => ({ id: r.key, key: r.key, code: r.key, name: r.name }))
      : [];

    return NextResponse.json({ regions });
  } catch (err) {
    console.error('Region API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
