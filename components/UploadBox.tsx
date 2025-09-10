'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function UploadBox() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      // Берём access token текущей сессии
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/summarize', {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      router.refresh();
      setMsg('Готово! Конспект добавлен в историю ниже.');
    } catch (err: any) {
      setMsg(err?.message || 'Ошибка загрузки');
    } finally {
      setBusy(false);
      // позволяем выбрать тот же файл ещё раз
      e.target.value = '';
    }
  }

  return (
    <div className="card">
      <div className="small" style={{ marginBottom: 8 }}>
        Загрузите PDF (до 5 страниц, ~4.5MB)
      </div>
      <input
        type="file"
        accept="application/pdf"
        onChange={onChange}
        disabled={busy}
      />
      {busy && <div className="small" style={{ marginTop: 8 }}>Загружаю…</div>}
      {msg && <div className="small" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
