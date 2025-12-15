import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('admin_session');
    
    // Simple check: cookie must exist and have a specific value (in a real app, use a token)
    // For this simple app, we'll check if it equals the admin password hash or just a flag
    // We will set the cookie value to 'authenticated' in the login action
    
    if (authCookie?.value !== 'authenticated') {
      const loginUrl = new URL('/login', request.url);
      // Redirect to login page
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
