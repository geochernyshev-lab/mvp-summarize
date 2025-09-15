// app/api/logout/route.ts
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/db';

export async function POST() {
  const supabase = serverSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
