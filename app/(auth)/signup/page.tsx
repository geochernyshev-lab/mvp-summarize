'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Signup() {
  const [email,setEmail]=useState(''); const [pass,setPass]=useState(''); const [pass2,setPass2]=useState('');
  const [msg,setMsg]=useState<string|null>(null);

  const submit=async(e:any)=>{ e.preventDefault(); setMsg(null);
    if (pass!==pass2) return setMsg('Пароли не совпадают');
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) setMsg(error.message);
    else { setMsg('Проверьте почту, подтвердите адрес. Затем войдите.'); }
  };

  return (
    <form className="card grid" onSubmit={submit}>
      <h2>Регистрация</h2>
      <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <input placeholder="Пароль" type="password" value={pass} onChange={e=>setPass(e.target.value)} required/>
      <input placeholder="Повторите пароль" type="password" value={pass2} onChange={e=>setPass2(e.target.value)} required/>
      <button type="submit">Создать аккаунт</button>
      {msg && <div className="small">{msg}</div>}
      <div className="small">Уже есть аккаунт? <a href="/login">Войти</a></div>
    </form>
  );
}
