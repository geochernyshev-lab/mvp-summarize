'use client';

import { useEffect, useState } from 'react';
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

  async function loadData() {
    setLoading(true);
    setAuthErr(null);
    try {
      // Получаем текущего пользователя
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        setAuthErr('Нужно войти в аккаунт');
        setLoading(false);
        return;
      }

      // Квота именно для этого пользователя
      const { data: q } = await supabase
        .from('user_quotas')
        .select('user_id, used, "limit"')
        .eq('user_id', user.id)
        .maybeSingle();
      setQuota((q as any) || null);

      // История последних 20
      const { data: rows } = await supabase
        .from('summaries')
        .select('id, created_at, file_name, file_pages, file_bytes, summary')
        .order('created_at', { ascending: false })
        .limit(20);
      setSummaries((rows as any) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Перезагружаем после успешной загрузки файла
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
      <div className="small">
        Осталось загрузок:&nbsp;
        {quota ? Math.max(0, quota.limit - quota.used) : '—'}
      </div>

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
              <th>Страницы</th>
              <th>Размер</th>
              <th>Конспект</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length > 0 ? (
              summaries.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>{row.file_name}</td>
                  <td>{row.file_pages}</td>
                  <td>{(row.file_bytes / 1024).toFixed(1)} KB</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{row.summary}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="small">Пока пусто</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
