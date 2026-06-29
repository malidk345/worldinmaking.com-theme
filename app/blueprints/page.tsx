import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // If the path doesn't have an extension (isn't a file like .js, .css, .png)
  // and it's not the root or a known system path, rewrite it to /
  // This allows the client-side router in context/App.tsx to handle the path.
  const path = url.pathname;
  if (
    path !== '/' &&
    !path.includes('.') &&
    !path.startsWith('/_next') &&
    !path.startsWith('/api')
  ) {
    url.pathname = '/';
    return NextResponse.rewrite(url);
  }

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
