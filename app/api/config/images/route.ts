import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate credentials at startup
if (!supabaseUrl || !supabaseKey) {
  console.error('[CONFIG] ❌ Supabase credentials missing!');
  console.error('[CONFIG] Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('[CONFIG] See: GET-REAL-KEYS-NOW.txt');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const CONFIG_KEYS = ['max_image_weight','target_image_size','thumbnail_image_size','max_image_count','signed_url_ttl_seconds'];
function parseValue(v: string){ return /^[0-9.,]+$/.test(v) ? Number(v.replace(/,/g,'')) : v; }

export async function GET(_req: NextRequest){
  if (!supabase) {
    console.error('[CONFIG] ❌ Cannot load config - Supabase not initialized');
    console.error('[CONFIG] Get valid keys from: https://app.supabase.com/project/cjpcqpspajbewtzmftpq/settings/api');
    return NextResponse.json({
      error: 'Database not configured',
      message: 'Supabase credentials are missing. See server console for details.',
      action: 'Get keys from Supabase Dashboard → Settings → API'
    }, { status: 500 });
  }

  try {
    console.log('[CONFIG] Fetching image config from database...');
    const { data, error } = await supabase.from('config').select('name,value').in('name', CONFIG_KEYS);

    if(error) {
      console.error('[CONFIG] ❌ Database error:', error.message);
      console.error('[CONFIG] Hint:', error.hint);
      console.error('[CONFIG] Your Supabase keys are INVALID or EXPIRED');
      console.error('[CONFIG] Get fresh keys: https://app.supabase.com/project/cjpcqpspajbewtzmftpq/settings/api');

      return NextResponse.json({
        error: 'Invalid Supabase credentials',
        message: error.message,
        hint: error.hint,
        action: 'Replace keys in .env.local with fresh keys from Supabase Dashboard'
      }, { status: 401 });
    }

    console.log('[CONFIG] ✅ Successfully loaded config:', data?.length || 0, 'keys');
    const map: Record<string, any> = {};
    (data||[]).forEach(r=>{ map[r.name] = parseValue(r.value); });
    return NextResponse.json({ config: map });

  } catch(e: any){
    console.error('[CONFIG] ❌ Unexpected error:', e.message);
    return NextResponse.json({
      error: 'Failed to load config',
      message: e?.message || 'Unknown error'
    }, { status: 500 });
  }
}

