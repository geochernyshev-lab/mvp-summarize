// app/api/history/[id]/route.ts
// @ts-nocheck
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function token(req: NextRequest) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(/sb-access-token=([^;]+)/);
  return req.headers.get('authorization')?.replace(/^Bearer\s+/, '') || m?.[1];
}
function sb(req: NextRequest){
  const t = token(req);
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    t ? { global: { headers: { Authorization: `Bearer ${t}` } } } : undefined
  );
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = sb(req);
  const { data: { user } } = await s.auth.getUser();
  if (!user) return new Response('UNAUTH', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || '').trim().slice(0, 200);
  if (!title) return new Response('Bad title', { status: 400 });

  const { error } = await s
    .from('summaries')
    .update({ title })
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return new Response(JSON.stringify(error), { status: 500 });
  return new Response(null, { status: 204 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = sb(req);
  const { data: { user } } = await s.auth.getUser();
  if (!user) return new Response('UNAUTH', { status: 401 });

  const { error } = await s
    .from('summaries')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return new Response(JSON.stringify(error), { status: 500 });
  // Токены не возвращаем — ничего не трогаем в user_quotas
  return new Response(null, { status: 204 });
}
