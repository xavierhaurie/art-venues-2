// filepath: src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';
import { sendFeedbackNotification } from '@/lib/email';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const messageLimiter = new RateLimiterMemory({ points: 10, duration: 3600 }); // 10 per hour

/**
 * POST /api/feedback
 * Submit feedback with email and message
 * Sends confirmation email to verify email address
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit per user
    try {
      await messageLimiter.consume(userId);
    } catch (rlErr: any) {
      const retrySec = Math.ceil((rlErr.msBeforeNext || 0) / 1000);
      return NextResponse.json({ error: "You've reached the maximum number of messages sent in an hour. Please wait and submit again later.", retryAfter: retrySec }, { status: 429 });
    }

    const body = await request.json();
    const { message } = body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    const supabaseLocal = createClient(supabaseUrl, supabaseServiceKey);

    // Get user info (email + name)
    const { data: userRow, error: userError } = await supabaseLocal
      .from('app_user')
      .select('email,name')
      .eq('id', userId)
      .single();
    if (userError || !userRow) {
      console.error('Failed to fetch user row:', userError);
      return NextResponse.json({ error: 'User lookup failed' }, { status: 500 });
    }

    const trimmedMessage = message.trim();

    const { error: insertError } = await supabaseLocal
      .from('contact_message')
      .insert({ user_id: userId, message: trimmedMessage, processed: false });
    if (insertError) {
      console.error('Failed to insert contact_message:', insertError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Fetch support emails
    const { data: cfgRows, error: cfgError } = await supabaseLocal
      .from('config')
      .select('value')
      .eq('name', 'support_email');
    if (cfgError) {
      console.error('Failed loading support emails:', cfgError);
    }
    const supportEmails = (cfgRows || []).map(r => r.value).filter(v => !!v);

    // Compose notification body
    const subject = 'New message from a Minilist user';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width:600px;">
        <h2>${subject}</h2>
        <p><strong>User Email:</strong> ${userRow.email}</p>
        <p><strong>User Name:</strong> ${userRow.name || '(no name)'} </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p style="white-space:pre-wrap;">${trimmedMessage}</p>
      </div>
    `;
    const textBody = `User Email: ${userRow.email}\nUser Name: ${userRow.name || '(no name)'}\n\nMessage:\n${trimmedMessage}`;

    try {
      if (supportEmails.length > 0) {
        // Reuse notification function (pass user email + message in one string)
        await sendFeedbackNotification(supportEmails, userRow.email, `Name: ${userRow.name || '(no name)'}\n\n${trimmedMessage}`);
      }
    } catch (emailErr) {
      console.error('Support notification failed:', emailErr);
      // Do not fail request due to email
    }

    return NextResponse.json({ success: true, message: trimmedMessage });
  } catch (err) {
    console.error('Unhandled /api/feedback error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
