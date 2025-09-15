// @ts-nocheck
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function serverSupabaseWithAuth(authHeader?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const kind = (url.searchParams.get('kind') || 'summary') as 'summary' | 'terms' | 'simple';
    if (!id) return new Response('Missing id', { status: 400 });

    // <<< ВАЖНО: берём токен из заголовка Authorization >>>
    const authHeader = req.headers.get('authorization') || undefined;
    const sb = serverSupabaseWithAuth(authHeader);

    const { data, error } = await sb
      .from('summaries')
      .select('file_name, summary, terms, simple, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return new Response('Not found or forbidden', { status: 404 });

    const titleMap: any = { summary: 'Краткий конспект', terms: 'Термины', simple: 'Объясни просто' };
    const content = (data as any)[kind] as string | null;
    if (!content) return new Response('Пусто', { status: 400 });

    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    const fname = sanitize(`${data.file_name} - ${titleMap[kind]}.pdf`);

    doc.fontSize(16).text(`${titleMap[kind]}`, { align: 'left' }).moveDown(0.5);
    doc.fontSize(11).fillColor('#666').text(new Date(data.created_at).toLocaleString()).fillColor('#000').moveDown();
    doc.fontSize(12).text(content, { align: 'left' });
    doc.end();

    await new Promise(res => doc.on('end', res));
    const pdf = Buffer.concat(chunks);

    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fname}"`
      }
    });
  } catch (e) {
    console.error(e);
    return new Response('Internal Error', { status: 500 });
  }
}

function sanitize(s: string) {
  return s.replace(/[^\w\-. ]+/g, '_').slice(0, 120);
}
