'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    try { setBusy(true); await supabase.auth.signOut(); window.location.href = '/'; }
    finally { setBusy(false); }
  }

  return (
    <header className="site-header">
      <a href="/" className="brand">PDF → Конспект</a>
      {authed === null ? null : (
        <nav className="nav">
          {!authed ? (
            <>
              <a className="btn ghost" href="/login">Вход</a>
              <a className="btn primary" href="/signup">Регистрация</a>
            </>
          ) : (
            <>
              <a className="btn ghost" href="/dashboard">Дашборд</a>
              <button className="btn danger" onClick={logout} disabled={busy}>{busy ? 'Выходим…' : 'Выйти'}</button>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
