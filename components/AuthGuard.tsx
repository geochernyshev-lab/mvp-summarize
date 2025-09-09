'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({data})=>{
      if (!data.session) location.href = '/login';
      else setReady(true);
    });
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
