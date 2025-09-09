'use client';
import { useState } from 'react';

export default function UploadBox({ onDone }: { onDone: ()=>void }) {
  const [file, setFile] = useState<File|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const submit = async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/summarize', { method:'POST', body: fd });
    setLoading(false);
    if (!res.ok) {
      const t = await res.text();
      setError(t || 'Upload failed');
      return;
    }
    onDone();
    location.reload();
  };

  return (
    <div className="card grid">
      <div>
        <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <div className="small">PDF до 5 страниц. У каждого пользователя доступно 20 загрузок.</div>
      </div>
      <button disabled={!file || loading} onClick={submit}>
        {loading ? 'Обработка...' : 'Загрузить и получить конспект'}
      </button>
      {error && <div className="small" style={{color:'#ff8080'}}>{error}</div>}
    </div>
  );
}
