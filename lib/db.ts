import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function serverSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Для RSC/route handlers сеттеры не используются
        set() {},
        remove() {}
      }
    }
  );
}
