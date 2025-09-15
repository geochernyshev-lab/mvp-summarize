// components/Header.tsx
import Link from 'next/link';
import { serverSupabase } from '@/lib/db';

export default async function Header() {
  const supabase = serverSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo link-reset">Антиучебник</Link>

        <nav className="nav">
          {!user ? (
            <>
              <Link href="/login" className="btn btn-ghost">Войти</Link>
              <Link href="/signup" className="btn btn-primary">Регистрация</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="btn btn-ghost">Дашборд</Link>
              <form action="/api/logout" method="post" className="inline">
                <button type="submit" className="btn btn-danger">Выйти</button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
