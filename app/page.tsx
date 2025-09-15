// app/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import styles from '../styles/landing.module.css';

export const dynamic = 'force-dynamic';

async function getSession() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (k: string) => cookieStore.get(k)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export default async function Landing() {
  const user = await getSession();

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>Антиучебник</Link>
        <nav className={styles.nav}>
          {user ? (
            <>
              <Link href="/dashboard" className={styles.navBtn}>Дэшборд</Link>
              <Link href="/logout" className={styles.outlineBtn}>Выйти</Link>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.navBtn}>Войти</Link>
              <Link href="/signup" className={styles.outlineBtn}>Регистрация</Link>
            </>
          )}
        </nav>
      </header>

      <section className={styles.hero}>
        <h1>Конспекты, термины и «объясни&nbsp;просто» за минуты</h1>
        <p>Загружайте PDF, DOCX или изображение — получайте короткий конспект,
           таблицу терминов и простое объяснение на языке исходного файла.</p>
        <div className={styles.cta}>
          <Link href={user ? "/dashboard" : "/signup"} className={styles.ctaBtn}>
            {user ? "Перейти в дэшборд" : "Попробовать бесплатно"}
          </Link>
          <span className={styles.note}>Без сложных настроек. 5 страниц на файл, лимит по токенам.</span>
        </div>
      </section>

      <section className={styles.features}>
        <div>
          <h3>Мультимодальность</h3>
          <p>PDF, DOCX, JPEG/PNG/HEIC — всё приводим к тексту и анализируем.</p>
        </div>
        <div>
          <h3>Выдачи на выбор</h3>
          <p>Краткий конспект, таблица терминов, «объясни просто». Скачивание в PDF.</p>
        </div>
        <div>
          <h3>Личный кабинет</h3>
          <p>История, поиск, переименование и удаление загрузок.</p>
        </div>
      </section>
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Антиучебник
      </footer>
    </main>
  );
}
