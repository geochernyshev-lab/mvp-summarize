'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/summarize', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Обновляем серверный компонент (историю/квоту)
      router.refresh();
      setMsg('Готово! Конспект добавлен в историю ниже.');
    } catch (err: any) {
      setMsg(err?.message || 'Ошибка загрузки');
    } finally {
      setBusy(false);
      // сбрасываем инпут, чтобы можно было выбрать тот же файл снова
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
