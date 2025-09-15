async function downloadPart(id: string, kind: 'summary'|'terms'|'simple', name: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token; if (!token) { alert('Сессия истекла'); return; }
  const res = await fetch(`/api/download?id=${id}&kind=${kind}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { alert('Ошибка скачивания'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const base = (name || 'document').replace(/\.[^.]+$/, '');
  const title = kind === 'summary' ? 'Краткий конспект' : kind === 'terms' ? 'Термины' : 'Объясни просто';
  a.href = url; a.download = `${base} - ${title}.pdf`; a.click();
  URL.revokeObjectURL(url);
}
