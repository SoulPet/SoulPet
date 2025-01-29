import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifyToken } from './lib/auth'

// Paths that don't require authentication
const publicPaths = [
    '/api/auth/email/signin',
    '/api/auth/email/signup',
    '/api/auth/wallet',
    '/signin',
    '/signup',
]

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public paths
    if (publicPaths.includes(pathname)) {
        return NextResponse.next()
    }

    // Check for auth token
    const token = request.headers.get('authorization')?.split(' ')[1]

    if (!token) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        )
    }

    try {
        // Verify token
        const { userId } = verifyToken(token)

        // Add user ID to headers
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('X-User-ID', userId)

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
        )
    }
}

// Configure middleware to run on specific paths
export const config = {
    matcher: [
        '/api/:path*',
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
} 