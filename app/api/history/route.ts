// app/api/history/route.ts
// @ts-nocheck
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getTokenFromCookies(req: NextRequest) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(/sb-access-token=([^;]+)/);
  return m?.[1];
}
function sbClient(req: NextRequest){
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/,'') || getTokenFromCookies(req);
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const only = url.searchParams.get('only'); // 'summary' | 'terms' | 'simple' | null
  const sb = sbClient(req);

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response('UNAUTH', { status: 401 });

  let query = sb
    .from('summaries')
    .select('id, title, file_name, created_at, pages, bytes, summary, terms, simple')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) query = query.or(`title.ilike.%${q}%,file_name.ilike.%${q}%`);
  let { data, error } = await query;
  if (error) return new Response(JSON.stringify(error), { status: 500 });

  // простая фильтрация по типу выдачи
  if (only && Array.isArray(data)) {
    data = data.filter((r: any) => Boolean((r as any)[only]));
  }

  // уберём тяжелые поля до клика (оставим превью 0..240 символов)
  data = data.map((r: any) => ({
    ...r,
    summary_preview: r.summary ? String(r.summary).slice(0, 240) : null,
    terms_preview: r.terms ? String(r.terms).slice(0, 240) : null,
    simple_preview: r.simple ? String(r.simple).slice(0, 240) : null,
    summary: undefined, terms: undefined, simple: undefined
  }));

  return Response.json(data);
}
