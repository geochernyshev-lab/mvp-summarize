'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // начальное состояние
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    });
    // подписка на смену авторизации
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    try {
      setBusy(true);
      await supabase.auth.signOut();
      // после выхода — на главную
      window.location.href = '/';
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="site-header">
      <a href="/" className="brand">PDF ➜ Конспект</a>

      {/* Пока не знаем статус — ничего не рисуем, чтобы не мигало */}
      {authed === null ? null : (
        <nav className="nav">
          {!authed ? (
            <>
              <a className="btn ghost" href="/login">Вход</a>
              <a className="btn primary" href="/signup">Регистрация</a>
            </>
          ) : (
            <button className="btn danger" onClick={logout} disabled={busy}>
              {busy ? 'Выходим…' : 'Выйти'}
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
