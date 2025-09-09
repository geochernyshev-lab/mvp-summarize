'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email,setEmail]=useState(''); const [pass,setPass]=useState(''); const [msg,setMsg]=useState<string|null>(null);

  const submit=async(e:any)=>{ e.preventDefault(); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setMsg(error.message);
    else location.href='/dashboard';
  };

  return (
    <form className="card grid" onSubmit={submit}>
      <h2>Вход</h2>
      <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <input placeholder="Пароль" type="password" value={pass} onChange={e=>setPass(e.target.value)} required/>
      <button type="submit">Войти</button>
      <a className="small" href="/reset">Забыли пароль?</a>
      {msg && <div className="small" style={{color:'#ff8080'}}>{msg}</div>}
    </form>
  );
}
