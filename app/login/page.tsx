'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string|null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      window.location.href = '/dashboard';
    } catch (err:any) { setMsg(err?.message || 'Ошибка входа'); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="form-card">
        <h1>Вход</h1>
        <p className="muted">Введите email и пароль.</p>
        <form onSubmit={onSubmit} className="form">
          <div className="form-group">
            <label>Email</label>
            <input type="email" inputMode="email" autoComplete="email" required placeholder="you@example.com"
              value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" autoComplete="current-password" required placeholder="Ваш пароль"
              value={pass} onChange={e=>setPass(e.target.value)} />
          </div>
          <button className="btn primary btn-lg" disabled={busy}>{busy?'Входим…':'Войти'}</button>
        </form>
        <div className="muted" style={{marginTop:12}}>Нет аккаунта? <a className="link" href="/signup">Регистрация</a></div>
        {msg && <div className="alert">{msg}</div>}
      </div>
    </div>
  );
}
