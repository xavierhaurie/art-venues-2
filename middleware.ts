import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Canonical global middleware entry for Next.js
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth', '/api/auth/magic-link', '/api/auth/magic-link/verify', '/api/auth/oauth'];

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, check if user has a session
  const sessionCookie = request.cookies.get('session');

  // If no session and trying to access protected route, redirect to auth
  if (!sessionCookie && (pathname.startsWith('/dashboard') || pathname.startsWith('/totp-setup'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

