// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Защищаем только /dashboard.
 * Проверяем наличие supabase cookie 'sb-access-token'.
 * Если нет — отправляем на /login?next=/dashboard
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    const hasAccess = req.cookies.has('sb-access-token');
    if (!hasAccess) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
