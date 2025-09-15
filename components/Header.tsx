'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
    try { setBusy(true); await supabase.auth.signOut(); window.location.replace('/'); }
    finally { setBusy(false); }
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand">Антиучебник</Link>
      {authed === null ? null : (
        <nav className="nav">
          {!authed ? (
            <>
              <Link className="btn ghost" href="/login">Вход</Link>
              <Link className="btn primary" href="/signup">Регистрация</Link>
            </>
          ) : (
            <>
              <Link className="btn ghost" href="/dashboard">Дашборд</Link>
              <button className="btn danger" onClick={logout} disabled={busy}>
                {busy ? 'Выходим…' : 'Выйти'}
              </button>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
