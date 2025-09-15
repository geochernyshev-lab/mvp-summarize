'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Modal from '@/components/Modal';

type Modes = { summary: boolean; terms: boolean; simple: boolean };
type ApiOut = { id: string; summary?: string; terms?: string; simple?: string };

export default function UploadBox() {
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [modes, setModes] = useState<Modes>({ summary: true, terms: false, simple: false });
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ApiOut | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function toggleMode(k: keyof Modes) { setModes(v => ({ ...v, [k]: !v[k] })); }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setMsg(null);
    setBusy(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Сессия истекла. Войдите снова.');

      const fd = new FormData();
      fd.append('file', file);
      fd.append('modes', JSON.stringify(modes));

      const res = await fetch('/api/summarize', {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as ApiOut;
      setResult(data);
      setOpen(true);

      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('summary-added'));
    } catch (err: any) {
      setMsg(err?.message || 'Ошибка загрузки');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function downloadPart(id: string, kind: 'summary'|'terms'|'simple', fallbackName = 'result') {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { alert('Сессия истекла. Войдите снова.'); return; }

    const res = await fetch(`/api/download?id=${id}&kind=${kind}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const t = await res.text().catch(()=>'');
      alert(`Ошибка скачивания: ${t || res.status}`);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    // iOS Safari — лучше открыть во вкладке (download-атрибут не всегда работает)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      const base = (fallbackName || 'document').replace(/\.[^.]+$/, '');
      const title = kind === 'summary' ? 'Краткий конспект' : kind === 'terms' ? 'Термины' : 'Объясни просто';
      a.download = `${base} - ${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }

  return (
    <div className="card">
      <div className="small" style={{ marginBottom: 10 }}>
        Загрузите PDF/DOCX/изображение (до 5 страниц эквивалента, ~4.5MB)
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <label className="chk"><input type="checkbox" checked={modes.summary} onChange={() => toggleMode('summary')} /> Конспект</label>
        <label className="chk"><input type="checkbox" checked={modes.terms} onChange={() => toggleMode('terms')} /> Термины</label>
        <label className="chk"><input type="checkbox" checked={modes.simple} onChange={() => toggleMode('simple')} /> Объясни просто</label>
      </div>

      <label className={`file-btn btn-xl ${busy ? 'disabled' : ''}`}>
        <input
          type="file"
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/jpg,image/png,image/heic,image/heif"
          onChange={onChange}
          disabled={busy}
        />
        {busy ? 'Обрабатываю…' : 'Выбрать файл'}
      </label>
      {filename && <div className="small" style={{ marginTop: 8 }}>{filename}</div>}
      {msg && <div className="alert" style={{ marginTop: 10 }}>{msg}</div>}

      <Modal open={open} onClose={() => setOpen(false)} title="Результаты">
        {!result ? null : (
          <div style={{ display: 'grid', gap: 12 }}>
            {result.summary && (
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>Краткий конспект</h4>
                  <button className="btn ghost" onClick={() => downloadPart(result.id, 'summary', filename || 'document')}>Скачать PDF</button>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{result.summary}</div>
              </section>
            )}
            {result.terms && (
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>Термины</h4>
                  <button className="btn ghost" onClick={() => downloadPart(result.id, 'terms', filename || 'document')}>Скачать PDF</button>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{result.terms}</div>
              </section>
            )}
            {result.simple && (
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>Объясни просто</h4>
                  <button className="btn ghost" onClick={() => downloadPart(result.id, 'simple', filename || 'document')}>Скачать PDF</button>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{result.simple}</div>
              </section>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
