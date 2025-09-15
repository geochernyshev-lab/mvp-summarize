// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // пробрасываем заголовки запроса в ответ (рекомендация Next/Supabase)
  const res = NextResponse.next({ request: { headers: req.headers } });

  // Клиент Supabase, привязанный к cookie в middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Из-за несовпадений типов на разных версиях Next/Vercel явно приводим к any
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options?: Parameters<typeof res.cookies.set>[2]) => {
          res.cookies.set(name, value, options as any);
        },
        remove: (name: string, _options?: any) => {
          res.cookies.delete(name);
        },
      } as any,
    }
  );

  // Протект для /dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'required');
      return NextResponse.redirect(url);
    }
  }

  return res;
}

// Применяем middleware только к кабинету
export const config = {
  matcher: ['/dashboard/:path*'],
};
