// components/HistoryList.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Row = {
  id: string;
  title: string | null;
  file_name: string;
  created_at: string;
  pages: number | null;
  bytes: number | null;
  summary_preview?: string | null;
  terms_preview?: string | null;
  simple_preview?: string | null;
};

function formatBytes(n?: number | null) {
  if (!n) return '—';
  const u = ['B','KB','MB','GB']; let i = 0; let v = n;
  while (v >= 1024 && i < u.length-1) { v/=1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

export default function HistoryList() {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'all'|'summary'|'terms'|'simple'>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (only !== 'all') params.set('only', only);
    const r = await fetch(`/api/history?${params.toString()}`, { cache: 'no-store' });
    const data = r.ok ? await r.json() : [];
    setRows(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* first load */ }, []);
  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, only]);

  const onDelete = async (id: string) => {
    if (!confirm('Удалить запись? Токены не возвращаются.')) return;
    const r = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    if (r.ok) setRows((list) => list.filter(x => x.id !== id));
  };

  const startRename = (row: Row) => {
    setRenameId(row.id);
    setNewTitle(row.title || row.file_name);
  };
  const saveRename = async () => {
    if (!renameId) return;
    const r = await fetch(`/api/history/${renameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    if (r.ok) {
      setRows(list => list.map(x => x.id === renameId ? { ...x, title: newTitle } : x));
      setRenameId(null);
      setNewTitle('');
    }
  };

  return (
    <section className="card">
      <div className="toolbar">
        <input
          className="input"
          placeholder="Поиск по названию/файлу…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select className="input" value={only} onChange={e => setOnly(e.target.value as any)}>
          <option value="all">Все</option>
          <option value="summary">Только конспекты</option>
          <option value="terms">Только термины</option>
          <option value="simple">Только «объясни просто»</option>
        </select>
      </div>

      {loading ? <div className="muted">Загрузка…</div> : rows.length === 0 ? (
        <div className="muted">Пока пусто</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th className="hide-sm">Файл</th>
              <th>Стр.</th>
              <th className="hide-sm">Размер</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>
                  {renameId === r.id ? (
                    <div className="renameBox">
                      <input autoFocus className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                      <button className="btn" onClick={saveRename}>Сохранить</button>
                      <button className="btn ghost" onClick={() => setRenameId(null)}>Отмена</button>
                    </div>
                  ) : (
                    <>
                      <div className="title">{r.title || r.file_name}</div>
                      <div className="muted small">{new Date(r.created_at).toLocaleString()}</div>
                    </>
                  )}
                </td>
                <td className="hide-sm">{r.file_name}</td>
                <td>{r.pages ?? '—'}</td>
                <td className="hide-sm">{formatBytes(r.bytes)}</td>
                <td className="actions">
                  <button className="btn" onClick={() => startRename(r)}>Переименовать</button>
                  <Link className="btn ghost" href={`/dashboard?id=${r.id}`}>Открыть</Link>
                  <button className="btn danger" onClick={() => onDelete(r.id)}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
