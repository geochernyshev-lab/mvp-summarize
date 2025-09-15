// components/NavBar.tsx
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { serverSupabase } from "@/lib/db";

export default async function NavBar() {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  return (
    <header className="navbar">
      <div className="container navbar-row">
        <Link href="/" className="brand" prefetch={false}>
          Антиучебник
        </Link>

        <nav className="nav">
          {!authed ? (
            <>
              <Link href="/login" className="btn ghost" prefetch={false}>
                Войти
              </Link>
              <Link href="/signup" className="btn" prefetch={false}>
                Регистрация
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="btn ghost" prefetch={false}>
                Дашборд
              </Link>
              <LogoutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
