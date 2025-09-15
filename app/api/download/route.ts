// @ts-nocheck
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

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

    // Авторизация
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Запись только владельца
    const { data, error } = await sb
      .from('summaries')
      .select('file_name, summary, terms, simple, created_at, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return new Response('Not found', { status: 404 });

    const titleMap = { summary: 'Краткий конспект', terms: 'Термины', simple: 'Объясни просто' } as const;
    const title = titleMap[kind];
    const content = (data as any)[kind] as string | null;
    if (!content) return new Response('Пусто', { status: 400 });

    // === PDF с кириллицей: регистрируем fontkit и встраиваем TTF из /public/fonts ===
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit); // <- ВАЖНО

    const origin = `${url.protocol}//${url.host}`;
    const fontUrl = `${origin}/fonts/DejaVuSans.ttf`; // файл лежит в public/fonts/DejaVuSans.ttf
    const fontBytes = await fetch(fontUrl).then(r => {
      if (!r.ok) throw new Error('Font not found');
      return r.arrayBuffer();
    });
    const font = await pdfDoc.embedFont(new Uint8Array(fontBytes), { subset: true });

    // Макет A4
    const pageSize: [number, number] = [595.28, 841.89];
    const margin = 40;
    let page = pdfDoc.addPage(pageSize);
    let { width, height } = page.getSize();
    let x = margin;
    let y = height - margin;

    const dateStr = new Date(data.created_at).toLocaleString('ru-RU');

    // Заголовок и дата
    y = drawWrapped(page, font, 16, title, x, y, width - margin * 2, { color: rgb(0,0,0) }) - 6;
    y = drawWrapped(page, font, 11, dateStr, x, y, width - margin * 2, { color: rgb(0.4,0.4,0.4) }) - 8;

    // Текст
    const bodySize = 12;
    const lines = wrapText(content, font, bodySize, width - margin * 2);
    const lineHeight = bodySize * 1.35;

    for (const line of lines) {
      if (y - lineHeight < margin) {
        page = pdfDoc.addPage(pageSize);
        ({ width, height } = page.getSize());
        x = margin;
        y = height - margin;
      }
      page.drawText(line, { x, y, size: bodySize, font, color: rgb(0,0,0) });
      y -= lineHeight;
    }

    const bytes = await pdfDoc.save();
    const safeName = sanitize(`${data.file_name} - ${title}.pdf`);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (e:any) {
    console.error(e);
    if (String(e?.message || e).includes('Font not found')) {
      return new Response('Не найден шрифт /public/fonts/DejaVuSans.ttf. Загрузите TTF с кириллицей.', { status: 500 });
    }
    return new Response('Internal Error', { status: 500 });
  }
}

// helpers
function sanitize(s: string) {
  return s.replace(/[^\w\-. ]+/g, '_').slice(0, 120);
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = (text || '').split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const tentative = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(tentative, size);
    if (width <= maxWidth) {
      line = tentative;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        const chunks = hardWrap(w, font, size, maxWidth);
        if (chunks.length) {
          lines.push(...chunks.slice(0, -1));
          line = chunks[chunks.length - 1];
        } else {
          line = w;
        }
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function hardWrap(word: string, font: any, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  let buf = '';
  for (const ch of word) {
    const tentative = buf + ch;
    if (font.widthOfTextAtSize(tentative, size) <= maxWidth) {
      buf = tentative;
    } else {
      if (buf) out.push(buf);
      buf = ch;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function drawWrapped(page: any, font: any, size: number, text: string, x: number, y: number, maxWidth: number, opts: { color?: any } = {}) {
  const color = opts.color || rgb(0,0,0);
  const lines = wrapText(text, font, size, maxWidth);
  const lineHeight = size * 1.35;
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}
