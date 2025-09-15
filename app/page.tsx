// app/page.tsx
import Link from 'next/link';
import { serverSupabase } from '@/lib/db';

export default async function Home({
  searchParams,
}: {
  searchParams?: { auth?: string };
}) {
  const authRequired = searchParams?.auth === 'required';

  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Куда ведёт большая CTA-кнопка
  const ctaHref = user ? '/dashboard' : '/login';
  const ctaText = user ? 'Перейти в кабинет' : 'Попробовать бесплатно';

  return (
    <main className="container">
      {/* алерт авторизации, если middleware вернул ?auth=required */}
      {authRequired && (
        <div className="card warn mb-8">
          <h2 className="h2">Нужна авторизация</h2>
          <p className="muted">Пожалуйста, войдите или зарегистрируйтесь.</p>
          <div className="row mt-4">
            <Link href="/login" className="btn btn-primary">Войти</Link>
            <Link href="/signup" className="btn btn-ghost">Регистрация</Link>
          </div>
        </div>
      )}

      <section className="hero">
        <h1 className="display">
          Конспекты, термины и «объясни просто» за минуты
        </h1>
        <p className="lead">
          Загружайте PDF, DOCX или изображение — получайте короткий конспект,
          таблицу терминов и простое объяснение на языке исходного файла.
        </p>

        <div className="row mt-6">
          <Link href={ctaHref} className="btn btn-primary btn-lg">
            {ctaText}
          </Link>

          {!user && (
            <div className="row gap-sm">
              <Link href="/login" className="btn btn-ghost">Войти</Link>
              <Link href="/signup" className="btn btn-ghost">Регистрация</Link>
            </div>
          )}
        </div>

        <p className="muted mt-3">
          Без сложных настроек. 5 страниц на файл, лимит по токенам.
        </p>
      </section>

      <section className="features">
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
          <p>История, поиск, переименование и удаление загрузок.</p>
        </div>
      </section>
    </main>
  );
}
