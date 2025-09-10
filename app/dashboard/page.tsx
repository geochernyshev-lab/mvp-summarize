'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import UploadBox from '@/components/UploadBox';

type SummaryRow = {
  id: string;
  created_at: string;
  file_name: string;
  file_pages: number;
  file_bytes: number;
  summary: string;
};

type QuotaRow = {
  user_id: string;
  used: number;
  limit: number;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [quota, setQuota] = useState<QuotaRow | null>(null);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const remaining = useMemo(() => {
    if (!quota) return '—';
    return Math.max(0, quota.limit - quota.used);
  }, [quota]);

  function toggle(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  }

  async function loadData() {
    setLoading(true);
    setAuthErr(null);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setAuthErr('Нужно войти в аккаунт');
        return;
      }

      // Квота
      const { data: q } = await supabase
        .from('user_quotas')
        .select('user_id, used, "limit"')
        .eq('user_id', user.id)
        .maybeSingle();
      setQuota((q as any) ?? null);

      // История
      const { data: rows } = await supabase
        .from('summaries')
        .select('id, created_at, file_name, file_pages, file_bytes, summary')
        .order('created_at', { ascending: false })
        .limit(20);
      setSummaries((rows as any) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('summary-added', handler);
    return () => window.removeEventListener('summary-added', handler);
  }, []);

  if (authErr) {
    return (
      <div className="grid">
        <h2>Нужно войти</h2>
        <div className="muted">
          <a className="btn ghost" href="/login">Вход</a>
          &nbsp;
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
      ) : summaries.length === 0 ? (
        <div className="muted">Пока пусто</div>
      ) : (
        <div className="cards">
          {summaries.map((row) => {
            const isOpen = openIds.has(row.id);
            return (
              <article className="summary-card" key={row.id}>
                <div className="summary-meta">
                  <div className="meta-title">{row.file_name}</div>
                  <div className="meta-sub">
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span>{row.file_pages} стр.</span>
                    <span>•</span>
                    <span>{(row.file_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className={`summary-body ${isOpen ? 'open' : 'collapsed'}`}>
                  {row.summary}
                </div>

                <div className="summary-actions">
                  <button className="btn ghost" onClick={() => toggle(row.id)}>
                    {isOpen ? 'Скрыть' : 'Показать полностью'}
                  </button>
                  <button className="btn" onClick={() => copy(row.summary)}>Копировать</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
