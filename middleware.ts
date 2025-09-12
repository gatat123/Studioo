import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // 루트 경로를 /auth/login으로 리다이렉트
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 미들웨어에서는 더 이상 인증 체크를 하지 않고
  // 클라이언트 사이드에서만 처리
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