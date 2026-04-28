import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  // 1. Public paths (Landing, Login, Register)
  const isPublicPath = pathname === '/login' || pathname === '/register' || pathname === '/'

  if (!token && !isPublicPath) {
    // Force login if no token on protected routes
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isPublicPath) {
    // Redirect to trading dashboard if already logged in
    // Note: We'd ideally check the role here, but we'll default to trading.
    return NextResponse.redirect(new URL('/trading', request.url))
  }

  // 2. Role-based routing (Simplified for Phase 1)
  // In a full implementation, we'd decode the JWT header/payload 
  // without the secret just to get the 'role' claim for UI routing.
  if (pathname.startsWith('/admin') && token) {
    // We'll rely on the backend to throw 403, 
    // but we can add optimistic blocking here.
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/trading/:path*', '/login', '/register'],
}
