export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireArtist } from '@/lib/rbac';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/session';

// @ts-ignore
import sharp = require('sharp');

const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  DEV_BYPASS_AUTH ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function loadSignedTtl() {
  const { data, error } = await supabase.from('config').select('name,value').eq('name', 'signed_url_ttl_seconds').limit(1).single();
  if (error || !data) return 600; // fallback seconds
  const v = /^[0-9.,]+$/.test(data.value) ? Number(data.value.replace(/,/g, '')) : 600;
  return v;
}

async function loadImageConfig(supabaseInst: any) {
  const KEYS = ['max_image_weight', 'target_image_size', 'thumbnail_image_size', 'max_image_count', 'signed_url_ttl_seconds'];
  const { data, error } = await supabaseInst.from('config').select('name,value').in('name', KEYS);
  if (error) { console.error('Image config load failed:', error); return null; }
  const map: Record<string, any> = {};
  for (const row of data || []) map[row.name] = /^[0-9.,]+$/.test(row.value) ? Number(row.value.replace(/,/g, '')) : row.value;
  return map;
}

export async function GET(request: NextRequest, { params }: { params: { venueId: string } }) {
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const BUCKET = process.env.STORAGE_BUCKET_VENUE_IMAGES || 'artwork';
    const SIGNED_TTL = await loadSignedTtl();

    const { data, error } = await supabase
      .from('venue_image')
      .select('id, venue_id, artist_user_id, file_path, file_path_thumb, url, title, details, display_order, file_size, mime_type, created_at')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching venue images:', error);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    const imagesWithSignedUrls = await Promise.all(
      (data || []).map(async (image) => {
        const thumbPath = image.file_path_thumb || image.file_path;
        const { data: signedFull, error: errFull } = await supabase.storage.from(BUCKET).createSignedUrl(image.file_path, SIGNED_TTL);
        if (errFull) console.error('Error creating full-size signed URL:', errFull);
        let signedThumbUrl: string | undefined;
        try {
          const { data: signedThumb, error: errThumb } = await supabase.storage.from(BUCKET).createSignedUrl(thumbPath, SIGNED_TTL);
          if (errThumb) {
            // Suppress noisy 404 for missing thumbs; fall back silently
            const is404 = (errThumb as any)?.statusCode === '404' || /not found/i.test((errThumb as any)?.message || '');
            if (!is404) console.error('Error creating thumb signed URL:', errThumb);
          } else {
            signedThumbUrl = signedThumb?.signedUrl;
          }
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (!/not found/i.test(msg)) console.error('Thumb sign exception:', msg);
        }
        return {
          ...image,
          url: signedFull?.signedUrl || image.url,
          thumb_url: signedThumbUrl || signedFull?.signedUrl || image.url
        };
      })
    );

    return NextResponse.json({ images: imagesWithSignedUrls });
  } catch (error) {
    console.error('Error in venue images GET:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { venueId: string } }) {
  const rbacError = await requireArtist(request);
  if (rbacError) return rbacError;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const { data: existingImages } = await supabase
      .from('venue_image')
      .select('id')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId);

    const cfg = await loadImageConfig(supabase);
    if (!cfg) return NextResponse.json({ error: 'Config unavailable' }, { status: 500 });
    const MAX_COUNT = cfg.max_image_count || 20;
    const MAX_BYTES = cfg.max_image_weight || 200000;
    const TARGET_SIZE = cfg.target_image_size || 800;
    const THUMB_SIZE = cfg.thumbnail_image_size || 200;
    const SIGNED_TTL = cfg.signed_url_ttl_seconds || 300;

    if (existingImages && existingImages.length >= MAX_COUNT) {
      return NextResponse.json({ error: `Maximum ${MAX_COUNT} images allowed per venue` }, { status: 400 });
    }

    const { data: maxOrderData } = await supabase
      .from('venue_image')
      .select('display_order')
      .eq('venue_id', params.venueId)
      .eq('artist_user_id', session.userId)
      .order('display_order', { ascending: false })
      .limit(1);
    const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order + 1 : 1;

    let originalBuffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type;
    let mainExt = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : '';
    if (!mainExt) {
      const mt: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
      mainExt = mt[mime] || 'bin';
    }
    let mainBuffer = originalBuffer;
    let finalMime = mime;

    if (mime !== 'image/svg+xml' && mime !== 'image/gif') {
      try {
        let img = sharp(originalBuffer).rotate();
        const meta = await img.metadata();
        if (meta.width && meta.height && (meta.width > TARGET_SIZE || meta.height > TARGET_SIZE)) {
          img = img.resize({ width: meta.width >= meta.height ? TARGET_SIZE : undefined, height: meta.height > meta.width ? TARGET_SIZE : undefined, fit: 'inside' });
        }
        let quality = 85;
        let attempt = 0;
        while (attempt < 8) {
          const buf = await img.jpeg({ quality, chromaSubsampling: '4:4:4' }).toBuffer();
          if (buf.length <= MAX_BYTES) { mainBuffer = buf; finalMime = 'image/jpeg'; mainExt = 'jpg'; break; }
          quality -= 10; if (quality < 30) break; attempt++;
          img = sharp(originalBuffer).resize({ width: meta.width && meta.height && (meta.width > TARGET_SIZE || meta.height > TARGET_SIZE) ? (meta.width >= meta.height ? TARGET_SIZE : undefined) : undefined, height: meta.width && meta.height && (meta.width > TARGET_SIZE || meta.height > TARGET_SIZE) ? (meta.height > meta.width ? TARGET_SIZE : undefined) : undefined, fit: 'inside' }).jpeg({ quality, chromaSubsampling: '4:4:4' });
        }
        if (mainBuffer.length > MAX_BYTES) {
          return NextResponse.json({ error: `Compressed image still exceeds max weight (${mainBuffer.length} > ${MAX_BYTES} bytes)` }, { status: 400 });
        }
      } catch (err) {
        console.error('Resize/compress failed:', err);
        return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
      }
    } else if (originalBuffer.length > MAX_BYTES) {
      return NextResponse.json({ error: `Image exceeds max weight (${originalBuffer.length} > ${MAX_BYTES} bytes)` }, { status: 400 });
    }

    let thumbBuffer = mainBuffer;
    let thumbExt = mainExt;
    if (finalMime !== 'image/svg+xml' && finalMime !== 'image/gif') {
      try {
        const thumb = await sharp(mainBuffer).resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: 'inside' }).jpeg({ quality: 70, chromaSubsampling: '4:4:4' }).toBuffer();
        thumbBuffer = thumb; thumbExt = 'jpg';
      } catch (e) { console.warn('Thumbnail generation failed; falling back to main image'); }
    }

    const BUCKET = process.env.STORAGE_BUCKET_VENUE_IMAGES || 'artwork';
    const safeTimestamp = Date.now();
    const sanitizedUserId = String(session.userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedVenueId = String(params.venueId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const basePath = `${sanitizedUserId}/${sanitizedVenueId}/${safeTimestamp}`;
    const mainPath = `${basePath}.web.${mainExt}`;
    const thumbPath = `${basePath}.thumb.${thumbExt}`;

    const { error: uploadMainError } = await supabase.storage.from(BUCKET).upload(mainPath, mainBuffer, { contentType: finalMime, upsert: false });
    if (uploadMainError) {
      console.error('Upload main error:', uploadMainError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
    const { error: uploadThumbError } = await supabase.storage.from(BUCKET).upload(thumbPath, thumbBuffer, { contentType: 'image/jpeg', upsert: false });
    if (uploadThumbError) console.error('Upload thumb error:', uploadThumbError);

    const { data: imageData, error: dbError } = await supabase
      .from('venue_image')
      .insert({
        venue_id: params.venueId,
        artist_user_id: session.userId,
        file_path: mainPath,
        file_path_thumb: thumbPath,
        url: mainPath,
        title: title || null,
        display_order: nextOrder,
        file_size: mainBuffer.length,
        mime_type: finalMime
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving image record:', dbError);
      await supabase.storage.from(BUCKET).remove([mainPath, thumbPath]);
      return NextResponse.json({ error: 'Failed to save image record' }, { status: 500 });
    }

    const { data: signedFull } = await supabase.storage.from(BUCKET).createSignedUrl(mainPath, SIGNED_TTL);
    let signedThumbUrl: string | undefined;
    try {
      const { data: signedThumb, error: errThumb } = await supabase.storage.from(BUCKET).createSignedUrl(thumbPath, SIGNED_TTL);
      if (!errThumb) signedThumbUrl = signedThumb?.signedUrl;
      else {
        const is404 = (errThumb as any)?.statusCode === '404' || /not found/i.test((errThumb as any)?.message || '');
        if (!is404) console.error('Error creating thumb signed URL:', errThumb);
      }
    } catch (e: any) {
      if (!/not found/i.test(e?.message || '')) console.error('Thumb sign exception:', e?.message || e);
    }
    const responseImage = { ...imageData, url: signedFull?.signedUrl || imageData.url, thumb_url: signedThumbUrl || signedFull?.signedUrl || imageData.url };
    return NextResponse.json({ image: responseImage });
  } catch (error) {
    console.error('Error in venue images POST:', error);
    const msg = (error as any)?.message || JSON.stringify(error);
    return NextResponse.json({ error: `Failed to upload image: ${msg}` }, { status: 500 });
  }
}
