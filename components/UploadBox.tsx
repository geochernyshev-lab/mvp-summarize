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

  // iOS Safari: лучше открывать в новой вкладке
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
