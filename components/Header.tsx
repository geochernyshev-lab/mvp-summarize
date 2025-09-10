'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [busy, setBusy] = useState(false);
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
    <header>
      <a href="/" style={{ fontWeight: 600 }}>PDF ➜ Конспект</a>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <a href="/dashboard">Dashboard</a>
        <a href="/login">Вход</a>
        <a href="/signup">Регистрация</a>
        <button onClick={logout} disabled={busy} title="Выйти из аккаунта">
          {busy ? 'Выходим…' : 'Выйти'}
        </button>
      </div>
    </header>
  );
}
