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
      alert('Скопировано в буфер.');
    } catch {
      alert('Не удалось скопировать.');
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
      const { data: rows, error: rowsErr } = await supabase
        .from('summaries')
        .select('id, created_at, file_name, file_pages, file_bytes, summary')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!rowsErr) setSummaries((rows as any) ?? []);
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
        <div><a href="/login">Вход</a> · <a href="/signup">Регистрация</a></div>
      </div>
    );
  }

  return (
    <div className="grid">
      <h2>Загрузка PDF</h2>
      <div className="small">Осталось загрузок: {remaining}</div>

      <UploadBox />

      <h3>История</h3>
      {loading ? (
        <div className="small">Загружаю…</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Файл</th>
              <th>Стр.</th>
              <th>Размер</th>
              <th>Конспект</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {summaries.length > 0 ? (
              summaries.map((row) => {
                const isOpen = openIds.has(row.id);
                const short = row.summary.length > 220
                  ? row.summary.slice(0, 220) + '…'
                  : row.summary;

                return (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{row.file_name}</td>
                    <td>{row.file_pages}</td>
                    <td>{(row.file_bytes / 1024).toFixed(1)} KB</td>
                    <td style={{ maxWidth: 420 }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {isOpen ? row.summary : short}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button onClick={() => toggle(row.id)}>
                        {isOpen ? 'Скрыть' : 'Показать'}
                      </button>
                      &nbsp;
                      <button onClick={() => copy(row.summary)}>Копировать</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="small">Пока пусто</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
