'use client';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  return (
    <header>
      <Link href="/"><strong>MVP Summarizer</strong></Link>
      <nav style={{display:'flex', gap:12}}>
        <Link href="/dashboard">Dashboard</Link>
        <button onClick={async()=>{ await supabase.auth.signOut(); location.href='/'; }}>
          Logout
        </button>
      </nav>
    </header>
  );
}
