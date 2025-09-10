import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Атомарно гарантирует наличие строки квоты и инкрементит used (если used < limit)
 * Использует ПЕРЕДАННЫЙ (уже аутентифицированный) Supabase client.
 */
export async function ensureQuotaAndIncrement(sb: SupabaseClient) {
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) throw new Error('UNAUTH');

  // Создаём строку квоты при первом обращении
  await sb.rpc('ensure_quota_exists', { uid: user.id });

  // Атомарное увеличение на стороне Postgres
  const { data, error: incErr } = await sb.rpc('increment_quota', { uid: user.id });
  if (incErr) throw incErr;
  if (!data || (Array.isArray(data) && data.length === 0)) throw new Error('LIMIT_REACHED');

  const row: any = Array.isArray(data) ? data[0] : data;
  return { userId: user.id, used: row.used, limit: row.limit };
}
