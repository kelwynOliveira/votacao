import { describe, it, expect } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('Auth Middleware', () => {
  it('redirects unauthenticated users trying to access /admin to /login', () => {
    const req = new NextRequest('http://localhost:3000/admin');
    const response = middleware(req);

    expect(response.status).toBe(307); // NextResponse.redirect defaults to 307
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('redirects users with invalid admin_session cookie to /login', () => {
    const req = new NextRequest('http://localhost:3000/admin/settings', {
      headers: {
        cookie: 'admin_session=invalid_token',
      },
    });
    const response = middleware(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('allows access to /admin when admin_session is authenticated', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: 'admin_session=authenticated',
      },
    });
    const response = middleware(req);

    // NextResponse.next() returns a 200 with no location header redirect
    expect(response.headers.get('location')).toBeNull();
    expect(response.status).toBe(200);
  });

  it('allows public routes like home and vote without redirect', () => {
    const homeReq = new NextRequest('http://localhost:3000/');
    const homeRes = middleware(homeReq);
    expect(homeRes.headers.get('location')).toBeNull();

    const voteReq = new NextRequest('http://localhost:3000/vote/abc-123');
    const voteRes = middleware(voteReq);
    expect(voteRes.headers.get('location')).toBeNull();
  });
});
