import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/localities
 * Get all localities from the locality table
 */
export async function GET() {
  try {
    const { data: localities, error } = await supabase
      .from('locality')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching localities:', error);
      return NextResponse.json({ error: 'Failed to fetch localities' }, { status: 500 });
    }

    return NextResponse.json({ localities: localities || [] });
  } catch (error) {
    console.error('Error in localities GET:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch localities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

