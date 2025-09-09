import AuthGuard from '@/components/AuthGuard';
import UploadBox from '@/components/UploadBox';
import { serverSupabase } from '@/lib/db';

export default async function Dashboard() {
  const sb = serverSupabase();
  const { data: { user } } = await sb.auth.getUser();
  let summaries: any[] = [];
  if (user) {
    const { data } = await sb
      .from('summaries')
      .select('id, file_name, file_pages, file_bytes, summary, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    summaries = data || [];
  }
  const { data: quota } = await sb.from('user_quotas').select('*').eq('user_id', user?.id!).maybeSingle();

  return (
    <AuthGuard>
      <div className="grid">
        <h2>Загрузка PDF</h2>
        <div className="small">Осталось загрузок: {quota ? Math.max(0, quota.limit - quota.used) : '20'}</div>
        {/* @ts-expect-error Server Component child */}
        <UploadBox onDone={() => {}} />
        <h3>История</h3>
        <table className="table">
          <thead><tr><th>Дата</th><th>Файл</th><th>Страницы</th><th>Размер</th><th>Конспект</th></tr></thead>
          <tbody>
            {summaries.map(row=>(
              <tr key={row.id}>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>{row.file_name}</td>
                <td>{row.file_pages}</td>
                <td>{(row.file_bytes/1024).toFixed(1)} KB</td>
                <td style={{whiteSpace:'pre-wrap'}}>{row.summary}</td>
              </tr>
            ))}
            {summaries.length===0 && <tr><td colSpan={5} className="small">Пока пусто</td></tr>}
          </tbody>
        </table>
      </div>
    </AuthGuard>
  );
}
