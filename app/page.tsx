// app/page.tsx
import Link from 'next/link';
import { serverSupabase } from '@/lib/db';

export default async function Home() {
  const supabase = serverSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <section className="hero">
      <div className="hero__inner">
        <h1 className="hero__title">
          Конспекты, термины и «объясни просто» за минуты
        </h1>

        <p className="hero__lead">
          Загружайте PDF, DOCX или изображение — получайте короткий конспект,
          таблицу терминов и простое объяснение на языке исходного файла.
        </p>

        <div className="hero__cta">
          {user ? (
            <Link href="/dashboard" className="btn btn--primary btn--lg">
              Перейти в дашборд
            </Link>
          ) : (
            <Link href="/signup" className="btn btn--primary btn--lg">
              Попробовать бесплатно
            </Link>
          )}
        </div>

        <p className="hero__note">Без сложных настроек. 5 страниц на файл, лимит по токенам.</p>

        <div className="features">
          <div className="card">
            <h3>Мультимодальность</h3>
            <p>PDF, DOCX, JPEG/PNG/HEIC — всё приводим к тексту и анализируем.</p>
          </div>
          <div className="card">
            <h3>Выдачи на выбор</h3>
            <p>Краткий конспект, таблица терминов, «объясни просто». Скачивание в PDF.</p>
          </div>
          <div className="card">
            <h3>Личный кабинет</h3>
            <p>История, поиск, переименовывание и удаление загрузок.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
