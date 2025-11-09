import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CONFIG_KEYS = ['max_image_weight','target_image_size','thumbnail_image_size','max_image_count','signed_url_ttl_seconds'];
function parseValue(v: string){ return /^[0-9.,]+$/.test(v) ? Number(v.replace(/,/g,'')) : v; }

export async function GET(_req: NextRequest){
  try {
    const { data, error } = await supabase.from('config').select('name,value').in('name', CONFIG_KEYS);
    if(error) throw new Error(error.message);
    const map: Record<string, any> = {};
    (data||[]).forEach(r=>{ map[r.name] = parseValue(r.value); });
    return NextResponse.json({ config: map });
  } catch(e: any){
    return NextResponse.json({ error: 'Failed to load config', message: e?.message || 'Unknown error' }, { status: 500 });
  }
}

