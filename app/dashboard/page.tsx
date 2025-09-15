'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import UploadBox from '@/components/UploadBox';

type Row = {
  id: string;
  created_at: string;
  file_name: string;
  file_pages: number | null;
  file_bytes: number;
  file_type: string | null;  // 'pdf' | 'docx' | 'image' | ...
  summary: string | null;
  terms: string | null;
  simple: string | null;
};

type QuotaRow = { user_id: string; used: number; limit: number };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [quota, setQuota] = useState<QuotaRow | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const remaining = useMemo(() => (!quota ? '—' : Math.max(0, quota.limit - quota.used)), [quota]);

  function toggle(id: string) {
    setOpenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function copy(text: string) { try { await navigator.clipboard.writeText(text); } catch {} }

  async function downloadPart(id: string, kind: 'summary'|'terms'|'simple', name: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token; 
    if (!token) { router.replace('/login'); return; }

    const res = await fetch(`/api/download?id=${id}&kind=${kind}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { alert(`Ошибка скачивания: ${res.status}`); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      const base = (name || 'document').replace(/\.[^.]+$/, '');
      const title = kind === 'summary' ? 'Краткий конспект' : kind === 'terms' ? 'Термины' : 'Объясни просто';
      a.download = `${base} - ${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }

  async function load() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
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
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
      else { setChecking(false); load(); }
    });
    const h = () => load();
    window.addEventListener('summary-added', h);
    return () => window.removeEventListener('summary-added', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) return <div className="splash" />;

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
                  <div className="meta-title">
                    {row.file_name} {row.file_type ? `· ${row.file_type.toUpperCase()}` : ''}
                  </div>
                  <div className="meta-sub">
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                    {typeof row.file_pages === 'number' ? <><span>•</span><span>{row.file_pages} стр.</span></> : null}
                    <span>•</span><span>{(row.file_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                {row.summary && (
                  <section style={{ marginTop: 6 }}>
                    <div className="small" style={{ marginBottom: 6 }}>Краткий конспект</div>
                    <div className={`summary-body ${open ? '' : 'clamped'}`}>{row.summary}</div>
                    <div className="summary-actions">
                      <button className="btn ghost" onClick={() => toggle(row.id)}>
                        {open ? 'Скрыть' : 'Развернуть'}
                      </button>
                      <button className="btn" onClick={() => downloadPart(row.id, 'summary', row.file_name)}>
                        Скачать PDF
                      </button>
                      <button className="btn ghost" onClick={() => copy(row.summary!)}>Копировать</button>
                    </div>
                  </section>
                )}

                {row.terms && (
                  <section style={{ marginTop: 12 }}>
                    <div className="small" style={{ marginBottom: 6 }}>Термины</div>
                    <div className={`summary-body ${open ? '' : 'clamped'}`}>{row.terms}</div>
                    <div className="summary-actions">
                      <button className="btn ghost" onClick={() => toggle(row.id)}>
                        {open ? 'Скрыть' : 'Развернуть'}
                      </button>
                      <button className="btn" onClick={() => downloadPart(row.id, 'terms', row.file_name)}>
                        Скачать PDF
                      </button>
                      <button className="btn ghost" onClick={() => copy(row.terms!)}>Копировать</button>
                    </div>
                  </section>
                )}

                {row.simple && (
                  <section style={{ marginTop: 12 }}>
                    <div className="small" style={{ marginBottom: 6 }}>Объясни просто</div>
                    <div className={`summary-body ${open ? '' : 'clamped'}`}>{row.simple}</div>
                    <div className="summary-actions">
                      <button className="btn ghost" onClick={() => toggle(row.id)}>
                        {open ? 'Скрыть' : 'Развернуть'}
                      </button>
                      <button className="btn" onClick={() => downloadPart(row.id, 'simple', row.file_name)}>
                        Скачать PDF
                      </button>
                      <button className="btn ghost" onClick={() => copy(row.simple!)}>Копировать</button>
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
