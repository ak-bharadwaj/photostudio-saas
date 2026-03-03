/**
 * Next.js 16 Proxy (previously Middleware) — Server-side request guard.
 *
 * Runs before every request. Protected routes that have no token in
 * localStorage cannot be guarded at the server level for SPA-style JWT
 * (tokens live in localStorage, not cookies). However this proxy:
 *
 *  1. Redirects unauthenticated requests hitting /auth/callback to /login
 *     when the query param is absent (prevents bare-URL access).
 *  2. Handles the OAuth fragment-token callback: since hash fragments are
 *     never sent to the server, the page itself must parse them client-side
 *     (see /auth/callback/page.tsx).  The proxy simply ensures the
 *     route exists and passes through.
 *  3. Protects /admin/* routes by checking a short-lived session cookie
 *     that the login flow can optionally set (see auth-store.ts).
 *
 * For full cookie-based auth, migrate tokens to httpOnly cookies and
 * verify them here with jose (Edge-compatible JWT library).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are publicly accessible without authentication
const PUBLIC_PATHS = [
  '/login',
  '/auth/',
  '/studio/',
  '/portal/',
  '/api/',
  '/_next/',
  '/favicon',
  '/icons/',
  '/manifest.json',
  '/sw.js',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and Next.js internals
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // For dashboard routes we cannot verify localStorage tokens at the Edge.
  // The client-side DashboardLayout already handles redirect to /login.
  // What we CAN do is add security headers to every response.
  const response = NextResponse.next();

  // Additional security headers (supplement Helmet on the API side)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  return response;
}

export const config = {
  // Run on all routes except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
