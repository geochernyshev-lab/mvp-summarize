'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState(''); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (pass !== pass2) { setMsg('Пароли не совпадают'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password: pass });
      if (error) throw error;
      setMsg('Готово! Подтвердите email через письмо, затем войдите.');
    } catch (err:any){ setMsg(err?.message || 'Ошибка регистрации'); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="form-card">
        <h1>Регистрация</h1>
        <p className="muted">Укажите email и придумайте пароль.</p>
        <form onSubmit={onSubmit} className="form">
          <div className="form-group">
            <label>Email</label>
            <input type="email" inputMode="email" autoComplete="email" required placeholder="you@example.com"
              value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" autoComplete="new-password" required placeholder="Минимум 6 символов"
              value={pass} onChange={e=>setPass(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Повторите пароль</label>
            <input type="password" autoComplete="new-password" required placeholder="Повторите пароль"
              value={pass2} onChange={e=>setPass2(e.target.value)} />
          </div>
          <button className="btn primary btn-lg" disabled={busy}>{busy?'Создаём…':'Создать аккаунт'}</button>
        </form>
        <div className="muted" style={{marginTop:12}}>Уже есть аккаунт? <a className="link" href="/login">Войти</a></div>
        {msg && <div className="alert">{msg}</div>}
      </div>
    </div>
  );
}
