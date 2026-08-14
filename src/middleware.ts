import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/' || pathname === '/index.html') {
    return NextResponse.rewrite(new URL('/campo.html', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/index.html'],
};
