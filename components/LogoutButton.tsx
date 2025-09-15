// components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <button
      className="btn danger"
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Выйти
    </button>
  );
}
