'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Reset() {
  const [email,setEmail]=useState(''); const [msg,setMsg]=useState<string|null>(null);

  const submit=async(e:any)=>{ e.preventDefault(); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/login`
    });
    if (error) setMsg(error.message);
    else setMsg('Проверьте почту для восстановления пароля.');
  };

  return (
    <form className="card grid" onSubmit={submit}>
      <h2>Восстановление пароля</h2>
      <input placeholder="Ваш email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <button type="submit">Отправить письмо</button>
      {msg && <div className="small">{msg}</div>}
    </form>
  );
}
