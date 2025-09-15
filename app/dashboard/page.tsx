// app/dashboard/page.tsx (фрагмент начала файла, замени весь файл если проще)
import Link from 'next/link';
import { serverSupabase } from '@/lib/db';

export default async function DashboardPage() {
  const supabase = serverSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="authGate">
        <h2>Нужна авторизация</h2>
        <p>Пожалуйста, войдите или зарегистрируйтесь.</p>
        <div className="authGate__actions">
          <Link href="/login" className="btn btn--primary">Войти</Link>
          <Link href="/signup" className="btn btn--ghost">Регистрация</Link>
        </div>
      </div>
    );
  }

  // ... дальше твой настоящий контент дашборда
}
