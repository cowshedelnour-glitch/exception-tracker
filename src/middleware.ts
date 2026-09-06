import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/locales') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico';

  // If user is not authenticated and trying to access a protected route
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('returnUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated
  if (user) {
    const role = user.user_metadata?.role || 'agent';

    // If visiting /login or root /, redirect to role dashboard
    if (pathname === '/login' || pathname === '/') {
      let targetDashboard = '/agent';
      if (role === 'manager') targetDashboard = '/manager';
      if (role === 'admin') targetDashboard = '/admin';
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    // Role-based protection
    if (pathname.startsWith('/agent') && role !== 'agent' && role !== 'admin') {
      const redirectPath = role === 'manager' ? '/manager' : '/admin';
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    if (pathname.startsWith('/manager') && role !== 'manager' && role !== 'admin') {
      const redirectPath = role === 'agent' ? '/agent' : '/admin';
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    if (pathname.startsWith('/admin') && role !== 'admin') {
      const redirectPath = role === 'manager' ? '/manager' : '/agent';
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};