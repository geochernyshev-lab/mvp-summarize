'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function UploadBox() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const [filename, setFilename] = useState<string|null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name); setMsg(null); setBusy(true);
    try{
      const { data:{session} } = await supabase.auth.getSession();
      const token = session?.access_token; if(!token) throw new Error('Сессия истекла. Войдите снова.');
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/summarize',{ method:'POST', body:fd, headers:{ Authorization:`Bearer ${token}` }});
      if(!res.ok) throw new Error(await res.text());
      setMsg('Готово! Конспект добавлен в историю ниже.');
      if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent('summary-added'));
    }catch(err:any){ setMsg(err?.message || 'Ошибка загрузки'); }
    finally{ setBusy(false); e.target.value=''; }
  }

  return (
    <div className="card">
      <div className="small" style={{marginBottom:10}}>Загрузите PDF (до 5 страниц, ~4.5MB)</div>
      <label className={`file-btn btn-xl ${busy ? 'disabled' : ''}`}>
        <input type="file" accept="application/pdf" onChange={onChange} disabled={busy} />
        {busy ? 'Загружаю…' : 'Выбрать PDF'}
      </label>
      {filename && <div className="small" style={{marginTop:8}}>{filename}</div>}
      {msg && <div className="alert" style={{marginTop:10}}>{msg}</div>}
    </div>
  );
}
