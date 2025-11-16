// filepath: src/app/api/feedback/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFeedbackNotification } from '@/lib/email';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/feedback/confirm?token=xxx
 * Confirm email address and save feedback to database
 * Sends notification to support team
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(
        '<html><body><h1>Invalid Confirmation Link</h1><p>The confirmation link is invalid or expired.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find and consume the token
    const { data: tokenData, error: tokenError } = await supabase
      .from('feedback_email_token')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('consumed_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new NextResponse(
        '<html><body><h1>Invalid or Expired Link</h1><p>This confirmation link is invalid or has already been used. Please submit your feedback again.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return new NextResponse(
        '<html><body><h1>Link Expired</h1><p>This confirmation link has expired. Please submit your feedback again.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Mark token as consumed
    const { error: consumeError } = await supabase
      .from('feedback_email_token')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (consumeError) {
      console.error('Failed to consume token:', consumeError);
      return new NextResponse(
        '<html><body><h1>Error</h1><p>An error occurred while confirming your email. Please try again.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Save the contact message
    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        email: tokenData.email,
        message: tokenData.message,
      });

    if (insertError) {
      console.error('Failed to save contact message:', insertError);
      return new NextResponse(
        '<html><body><h1>Error</h1><p>An error occurred while saving your message. Please contact support directly.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get support emails from config
    const { data: configData, error: configError } = await supabase
      .from('config')
      .select('value')
      .eq('name', 'support_email');

    let supportEmails: string[] = [];
    if (!configError && configData && configData.length > 0) {
      supportEmails = configData.map((row) => row.value);
    }

    // Send notification to support team
    if (supportEmails.length > 0) {
      try {
        await sendFeedbackNotification(supportEmails, tokenData.email, tokenData.message);
      } catch (emailError) {
        console.error('Failed to send support notification:', emailError);
        // Don't fail the request if notification fails
      }
    }

    // Return success page with redirect to client page that will set sessionStorage
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const redirectUrl = `${baseUrl}/feedback/confirm-success?email=${encodeURIComponent(tokenData.email)}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Feedback confirmation error:', error);
    return new NextResponse(
      '<html><body><h1>Error</h1><p>An unexpected error occurred. Please try again or contact support directly.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

export const dynamic = 'force-dynamic';
