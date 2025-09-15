'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const has = !!data.session;
      setAuthed(has);
      if (has) window.location.replace('/dashboard'); // мгновенный редирект для залогиненых
    });
  }, []);

  // Пока проверяем сессию — аккуратный сплэш, без мигалки
  if (authed === null) {
    return (
      <section className="hero">
        <div className="hero-head">Антиучебник</div>
        <div className="hero-sub muted">Готовим понятные конспекты из ваших файлов</div>
        <div className="splash" />
      </section>
    );
  }

  // Гость видит краткий лендинг
  return (
    <section className="hero">
      <div className="hero-head">Антиучебник</div>
      <div className="hero-sub muted">Загружайте PDF, DOCX, изображения. Получайте конспект, термины и «объясни просто».</div>
      <div className="cta-row">
        <Link href="/signup" className="btn primary btn-xl">Начать бесплатно</Link>
        <Link href="/login" className="btn ghost btn-xl">Войти</Link>
      </div>
      <ul className="bullets">
        <li>Поддержка: PDF (до 5 стр), DOCX, JPEG/PNG/HEIC</li>
        <li>Выдачи на выбор: Конспект, Термины, Объясни просто</li>
        <li>История и лимиты в личном кабинете</li>
      </ul>
    </section>
  );
}
