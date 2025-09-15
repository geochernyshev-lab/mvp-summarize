// @ts-nocheck
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function sbWithAuth(authHeader?: string) {
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

    const authHeader = req.headers.get('authorization') || undefined;
    const sb = sbWithAuth(authHeader);

    // Проверим, что пользователь авторизован
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Читаем свою запись
    const { data, error } = await sb
      .from('summaries')
      .select('file_name, summary, terms, simple, created_at, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return new Response('Not found', { status: 404 });

    const map = { summary: 'Краткий конспект', terms: 'Термины', simple: 'Объясни просто' } as const;
    const title = map[kind];
    const content = (data as any)[kind] as string | null;
    if (!content) return new Response('Пусто', { status: 400 });

    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('error', (e) => console.error('pdfkit error', e));

    doc.fontSize(16).text(title, { align: 'left' }).moveDown(0.5);
    doc.fontSize(11).fillColor('#666').text(new Date(data.created_at).toLocaleString()).fillColor('#000').moveDown();
    doc.fontSize(12).text(content, { align: 'left' });
    doc.end();

    await new Promise(res => doc.on('end', res));
    const pdf = Buffer.concat(chunks);

    const safeName = sanitize(`${data.file_name} - ${title}.pdf`);
    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-store'
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
