// app/dashboard/page.tsx
// @ts-nocheck
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import HistoryList from '../../components/HistoryList';
import UploadBox from '../../components/UploadBox';

export const dynamic = 'force-dynamic';

async function getData() {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (k: string) => cookieStore.get(k)?.value } }
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, quota: null };

  const { data: quota } = await sb
    .from('user_quotas')
    .select('used, limit')
    .eq('user_id', user.id)
    .maybeSingle();

  return { user, quota };
}

export default async function Dashboard() {
  const { user, quota } = await getData();
  if (!user) {
    return (
      <main className="container">
        <div className="card">
          <h2>Нужна авторизация</h2>
          <p className="muted">Пожалуйста, войдите или зарегистрируйтесь.</p>
          <div className="row">
            <a className="btn" href="/login">Войти</a>
            <a className="btn ghost" href="/signup">Регистрация</a>
          </div>
        </div>
      </main>
    );
  }

  const tokens = quota ? Math.max(0, (quota.limit ?? 0) - (quota.used ?? 0)) : 0;

  return (
    <main className="container">
      <section className="card">
        <div className="topRow">
          <h2>Загрузка файлов</h2>
          <div className="chip">Токены: <b>{tokens}</b></div>
        </div>
        <p className="muted small">PDF/DOCX/JPG/PNG/HEIC • до 5 страниц (для изображений — эвристический эквивалент) • лимит по токенам.</p>
        <UploadBox size="lg" />
      </section>

      <h3>История</h3>
      <HistoryList />
    </main>
  );
}
