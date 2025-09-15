// components/Header.tsx
import Link from 'next/link';
import { serverSupabase } from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function Header() {
  const supabase = serverSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  async function signOut() {
    'use server';
    const sb = serverSupabase();
    await sb.auth.signOut();
    redirect('/');
  }

  return (
    <header className="header">
      <div className="container header__row">
        <Link href="/" className="brand" aria-label="На главную">Антиучебник</Link>

        <nav className="nav">
          {!user && (
            <>
              <Link href="/login" className="btn btn--ghost">Войти</Link>
              <Link href="/signup" className="btn btn--primary">Регистрация</Link>
            </>
          )}

          {user && (
            <>
              <Link href="/dashboard" className="btn btn--ghost">Дашборд</Link>
              <form action={signOut}>
                <button type="submit" className="btn btn--danger">Выйти</button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
