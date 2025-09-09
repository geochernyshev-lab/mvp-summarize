import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

/**
 * Atomically ensure quota row exists and increment by 1 (used < limit).
 * Requires SQL functions:
 *  - ensure_quota_exists(uid uuid)
 *  - increment_quota(uid uuid) RETURNS TABLE (used int, limit int)
 */
export async function ensureQuotaAndIncrement() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('UNAUTH');

  // Ensure row exists
  await supabase.rpc('ensure_quota_exists', { uid: user.id });

  // Atomic increment on the server to avoid race conditions
  const { data, error: incErr } = await supabase.rpc('increment_quota', { uid: user.id });
  if (incErr) throw incErr;
  if (!data || data.length === 0) throw new Error('LIMIT_REACHED');

  const row = Array.isArray(data) ? data[0] : data;
  return { userId: user.id, used: row.used, limit: row.limit };
}
