import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes
const protectedRoutes = ['/studio', '/profile'];
const adminRoutes = ['/admin'];
const authRoutes = ['/auth/login', '/auth/register'];

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Production에서 www를 non-www로 리디렉션
  if (process.env.NODE_ENV === 'production' && hostname === 'www.dustdio.com') {
    return NextResponse.redirect(
      new URL(`https://dustdio.com${pathname}`, request.url)
    );
  }

  // 정적 파일과 API 라우트는 건너뛰기
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // 파일 확장자가 있는 경우
  ) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('token')?.value;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // 루트 경로를 /auth/login으로 리다이렉트
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/studio', request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // If no token and trying to access protected/admin routes, redirect to login
  if (!token && (isProtectedRoute || isAdminRoute)) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If token exists and trying to access auth routes, redirect to studio
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/studio', request.url));
  }

  // For admin routes, we'll check admin status in the layout
  // Since we can't decode JWT without the secret on the edge runtime
  // The actual admin check will be done in the admin layout component

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};