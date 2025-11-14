// filepath: src/app/api/feedback/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFeedbackNotification } from '/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/feedback/submit
 * Submit feedback directly (when email is already confirmed in session)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, message } = body;

    // Validate input
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedMessage = message.trim();

    // Save the contact message directly
    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        email: normalizedEmail,
        message: trimmedMessage,
      });

    if (insertError) {
      console.error('Failed to save contact message:', insertError);
      return NextResponse.json(
        { error: 'Failed to save your message. Please try again.' },
        { status: 500 }
      );
    }

    // Get support emails from config
    const { data: configData, error: configError } = await supabase
      .from('config')
      .select('value')
      .eq('name', 'support_email');

    let supportEmails: string[] = [];
    if (!configError && configData && configData.length > 0) {
      supportEmails = configData.map((row: any) => row.value);
    }

    // Send notification to support team
    if (supportEmails.length > 0) {
      try {
        await sendFeedbackNotification(supportEmails, normalizedEmail, trimmedMessage);
      } catch (emailError) {
        console.error('Failed to send support notification:', emailError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! We will review it shortly.',
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

