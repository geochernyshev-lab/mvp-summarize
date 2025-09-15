'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import UploadBox from '@/components/UploadBox';

type Row = {
  id: string;
  created_at: string;
  file_name: string;
  file_pages: number | null;
  file_bytes: number;
  file_type: string | null;
  summary: string | null;
  terms: string | null;
  simple: string | null;
};

type QuotaRow = { user_id: string; used: number; limit: number };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [quota, setQuota] = useState<QuotaRow | null>(null);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const remaining = useMemo(() => (!quota ? '—' : Math.max(0, quota.limit - quota.used)), [quota]);

  function toggle(id: string) {
    setOpenIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function load() {
    setLoading(true);
    setAuthErr(null);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { setAuthErr('Нужно войти в аккаунт'); return; }

      const { data: q } = await supabase
        .from('user_quotas')
        .select('user_id, used, "limit"')
        .eq('user_id', user.id)
        .maybeSingle();
      setQuota((q as any) ?? null);

      const { data: rs } = await supabase
        .from('summaries')
        .select('id, created_at, file_name, file_pages, file_bytes, file_type, summary, terms, simple')
        .order('created_at', { ascending: false })
        .limit(20);
      setRows((rs as any) ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener('summary-added', h);
    return () => window.removeEventListener('summary-added', h);
  }, []);

  if (authErr) {
    return (
      <div className="grid">
        <h1>Нужно войти</h1>
        <div className="muted" style={{ marginTop: 6 }}>
          <a className="btn ghost" href="/login">Вход</a>&nbsp;
          <a className="btn primary" href="/signup">Регистрация</a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="page-head">
        <h1>Дашборд</h1>
        <div className="chip">Осталось загрузок: <b>{remaining}</b></div>
      </div>

      <UploadBox />

      <h3 style={{ marginTop: 20, marginBottom: 8 }}>История</h3>

      {loading ? (
        <div className="muted">Загружаю…</div>
      ) : rows.length === 0 ? (
        <div className="muted">Пока пусто</div>
      ) : (
        <div className="cards">
          {rows.map(row => {
            const open = openIds.has(row.id);
            return (
              <article className="summary-card" key={row.id}>
                <div className="summary-meta">
                  <div className="meta-title">{row.file_name} {row.file_type ? `· ${row.file_type.toUpperCase()}` : ''}</div>
                  <div className="meta-sub">
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                    {row.file_pages ? <><span>•</span><span>{row.file_pages} стр.</span></> : null}
                    <span>•</span><span>{(row.file_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                {row.summary && (
                  <section style={{ marginTop: 6 }}>
                    <div className="small" style={{ marginBottom: 6 }}>Краткий конспект</div>
                    <div className={`summary-body ${open ? '' : 'clamped'}`}>{row.summary}</div>
                    <div className="summary-actions">
                      <button className="btn ghost" onClick={() => toggle(row.id)}>{open ? 'Скрыть' : 'Показать полностью'}</button>
                      <a className="btn" href={`/api/download?id=${row.id}&kind=summary`} target="_blank">Скачать PDF</a>
                    </div>
                  </section>
                )}

                {row.terms && (
                  <section style={{ marginTop: 12 }}>
                    <div className="small" style={{ marginBottom: 6 }}>Термины</div>
                    <div className={`summary-body ${open ? '' : 'clamped'}`}>{row.terms}</div>
                    <div className="summary-actions">
                      <button className="btn ghost" onClick={() => toggle(row.id)}>{open ? 'Скрыть' : 'Показать полностью'}</button>
                      <a className="btn" href={`/api/download?id=${row.id}&kind=terms`} target="_blank">Скачать PDF</a>
                    </div>
                  </section>
                )}

                {row.simple && (
                  <section style={{ marginTop: 12 }}>
                    <div className="small" style={{ marginBottom: 6 }}>Объясни просто</div>
                    <div className={`summary-body ${open ? '' : 'clamped'}`}>{row.simple}</div>
                    <div className="summary-actions">
                      <button className="btn ghost" onClick={() => toggle(row.id)}>{open ? 'Скрыть' : 'Показать полностью'}</button>
                      <a className="btn" href={`/api/download?id=${row.id}&kind=simple`} target="_blank">Скачать PDF</a>
                    </div>
                  </section>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
