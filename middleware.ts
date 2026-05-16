import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ratelimit, authRatelimit } from './lib/ratelimit';

/**
 * Middleware handles edge-level security.
 * It protects /admin specific routes by validating user roles in the database.
 */
export async function middleware(request: NextRequest) {
    // Rate limiting
    if (ratelimit) {
        // NextRequest no longer has .ip natively in edge functions unless passed from header
        // For standard vercel edge, it might be in x-real-ip or x-forwarded-for
        const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

        // Use authRatelimit for login and auth related routes, otherwise use general ratelimit
        const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                            request.nextUrl.pathname.startsWith('/api/auth');

        const activeRatelimit = isAuthRoute && authRatelimit ? authRatelimit : ratelimit;

        const { success } = await activeRatelimit.limit(ip);

        if (!success) {
            return new Response('Too Many Requests', {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test';

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // Refresh session if it exists
    const { data: { session } } = await supabase.auth.getSession();

    const isPathAdmin = request.nextUrl.pathname.startsWith('/admin');

    if (isPathAdmin) {
        if (!session) {
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = '/login';
            return NextResponse.redirect(redirectUrl);
        }

        // Check Role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role !== 'admin') {
            const homeUrl = request.nextUrl.clone();
            homeUrl.pathname = '/';
            return NextResponse.redirect(homeUrl);
        }
    }

    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
