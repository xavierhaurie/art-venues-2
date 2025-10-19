import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, getOAuthAccount, createOAuthAccount, updateUserLastLogin, createSessionRecord, logAuditEvent } from '@/lib/db';
import { createSession } from '@/lib/session';
import { checkRateLimit, getIPRateLimitKey } from '@/lib/rate-limit';

/**
 * GET /api/auth/oauth/facebook/callback
 * Handle Facebook OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=oauth_cancelled`);
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=missing_code`);
    }

    // Rate limiting per IP
    const rateLimitKey = getIPRateLimitKey(request.ip || 'unknown', 'login');
    const rateLimit = await checkRateLimit(rateLimitKey, 'login');

    if (!rateLimit.allowed) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=rate_limited&retryAfter=${rateLimit.retryAfter}`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${process.env.FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/oauth/facebook/callback`)}` +
      `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
      `&code=${code}`
    );

    if (!tokenResponse.ok) {
      console.error('Facebook token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Facebook
    const userInfoResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokens.access_token}`
    );

    if (!userInfoResponse.ok) {
      console.error('Facebook userinfo failed:', await userInfoResponse.text());
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=userinfo_failed`);
    }

    const facebookUser = await userInfoResponse.json();

    if (!facebookUser.email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=email_required`);
    }

    // Check if OAuth account exists
    let oauthAccount = await getOAuthAccount('facebook', facebookUser.id);
    let user;

    if (oauthAccount) {
      // Existing OAuth account
      user = await getUserByEmail(oauthAccount.user_id);
    } else {
      // Check if user exists by email
      user = await getUserByEmail(facebookUser.email);

      if (!user) {
        // Create new user
        user = await createUser(facebookUser.email, facebookUser.name);
        if (!user) {
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=user_creation_failed`);
        }
      }

      // Link OAuth account
      oauthAccount = await createOAuthAccount(user.id, 'facebook', facebookUser.id, {
        email: facebookUser.email,
        name: facebookUser.name,
      });
    }

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=user_not_found`);
    }

    // Check if this is first login and TOTP is not enabled
    const requiresTOTPSetup = !user.first_login_completed && !user.totp_enabled;

    // Create session
    const { token: sessionToken, jti, expiresAt } = createSession(user.id, user.email, user.role);

    // Store session in database
    await createSessionRecord(
      user.id,
      jti,
      expiresAt,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    // Update last login
    await updateUserLastLogin(user.id);

    // Log successful login
    await logAuditEvent(
      'auth.login.success',
      'user',
      user.id,
      { method: 'oauth_facebook', requiresTOTPSetup },
      user.id,
      request.ip,
      request.headers.get('user-agent') || undefined
    );

    // Redirect to app with session cookie
    const redirectUrl = requiresTOTPSetup
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/setup-totp`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

    const response = NextResponse.redirect(redirectUrl);

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?message=internal_error`);
  }
}

