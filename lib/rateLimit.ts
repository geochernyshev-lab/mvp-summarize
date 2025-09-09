import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Атомарно гарантирует наличие строки квоты и инкрементит used (если used < limit).
 * Нужны функции в БД:
 *  - ensure_quota_exists(uid uuid)
 *  - increment_quota(uid uuid) RETURNS TABLE (used int, "limit" int)
 */
export async function ensureQuotaAndIncrement() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set() {},
        remove() {}
      }
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('UNAUTH');

  // Создаём строку квоты при первом обращении
  await supabase.rpc('ensure_quota_exists', { uid: user.id });

  // Атомарное увеличение на стороне Postgres
  const { data, error: incErr } = await supabase.rpc('increment_quota', { uid: user.id });
  if (incErr) throw incErr;
  if (!data || (Array.isArray(data) && data.length === 0)) throw new Error('LIMIT_REACHED');

  const row: any = Array.isArray(data) ? data[0] : data;
  return { userId: user.id, used: row.used, limit: row.limit };
}
