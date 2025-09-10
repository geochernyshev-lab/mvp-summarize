import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Атомарно гарантирует наличие строки квоты и инкрементит used (если used < limit).
 * Больше НЕ трогаем auth — используем уже известный userId.
 */
export async function ensureQuotaAndIncrement(sb: SupabaseClient, userId: string) {
  // Создаём строку квоты при первом обращении
  await sb.rpc('ensure_quota_exists', { uid: userId });

  // Атомарное увеличение на стороне Postgres
  const { data, error: incErr } = await sb.rpc('increment_quota', { uid: userId });
  if (incErr) throw incErr;
  if (!data || (Array.isArray(data) && data.length === 0)) throw new Error('LIMIT_REACHED');

  const row: any = Array.isArray(data) ? data[0] : data;
  return { userId, used: row.used, limit: row.limit };
}
