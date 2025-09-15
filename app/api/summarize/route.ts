// @ts-nocheck
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processFile } from '@/lib/processFile';
import { ensureQuotaAndIncrement } from '@/lib/rateLimit';
import { openai } from '@/lib/openai';
import fs from 'fs';

// (страховка на случай старых dev-вызовов)
const __origReadFileSync: any = (fs as any).readFileSync;
(fs as any).readFileSync = function patchedReadFileSync(path: any, ...args: any[]) {
  try {
    if (typeof path === 'string' && path.includes('/test/data/05-versions-space.pdf')) return Buffer.from('');
    return __origReadFileSync.call(fs, path, ...args);
  } catch (e) {
    if (typeof path === 'string' && path.includes('/test/data/05-versions-space.pdf')) return Buffer.from('');
    throw e;
  }
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL || process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';

function serverSupabaseWithAuth(authHeader?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const sb = serverSupabaseWithAuth(authHeader);

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    await ensureQuotaAndIncrement(sb, user.id);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const modesRaw = form.get('modes') as string | null;

    if (!file) return new NextResponse('No file', { status: 400 });
    const mime = file.type;

    if (['application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'].indexOf(mime) === -1) {
      return new NextResponse('Поддерживаются: PDF, DOCX, JPEG/JPG, PNG, HEIC', { status: 400 });
    }

    if (file.size > 4_800_000) return new NextResponse('Файл слишком большой (~4.8MB макс)', { status: 413 });

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const processed = await processFile(buffer, mime);

    // Валидация страниц для PDF
    if (processed.kind === 'text' && processed.fileType === 'pdf') {
      if ((processed.pages || 0) > 5) {
        return new NextResponse('PDF должен содержать не более 5 страниц', { status: 400 });
      }
    }

    // Какие режимы запрошены
    let want = { summary: true, terms: false, simple: false };
    if (modesRaw) {
      try { want = { ...want, ...JSON.parse(modesRaw) }; } catch {}
    }

    // Сборка подсказки/сообщений для модели
    const baseRules = `You are an expert study assistant. Output must be in the document's language. 
Return ONLY JSON with possible keys among: "summary", "terms", "simple". 
- "summary": concise gist (6–10 bullets or tight paragraph)
- "terms": a short glossary as Markdown table: | Термин | Объяснение |. Use 5–15 key terms max.
- "simple": explain the core idea simply, with analogies if helpful (<= 10 sentences).
Do not add external facts. Keep numbers/names intact.`;

    const wantKeys = Object.entries(want).filter(([k, v]) => v).map(([k]) => k);
    const mustKeys = wantKeys.length ? wantKeys.join(', ') : 'summary';

    let messages: any[] = [
      { role: 'system', content: baseRules },
    ];

    if (processed.kind === 'text') {
      const text = processed.text.slice(0, 20000);
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Generate JSON with keys: ${mustKeys}. Document text:\n"""${text}"""` }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Generate JSON with keys: ${mustKeys}. The input is an image of a document/page. Read text from the image first.` },
          { type: 'image_url', image_url: { url: processed.dataUrl } }
        ]
      });
    }

    // Запрос к модели — пробуем JSON-режим, если поддерживается; иначе парсим вручную
    let out = { summary: undefined, terms: undefined, simple: undefined } as any;
    try {
      const resp = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' as any },
        messages,
      });
      const txt = resp.choices[0]?.message?.content?.trim() || '{}';
      out = JSON.parse(txt);
    } catch {
      const resp = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages,
      });
      const txt = resp.choices[0]?.message?.content?.trim() || '';
      out = safeGuessJSON(txt);
    }

    const summary = want.summary ? (out.summary || '') : null;
    const terms   = want.terms   ? (out.terms   || '') : null;
    const simple  = want.simple  ? (out.simple  || '') : null;

    if (!summary && !terms && !simple) {
      return new NextResponse('Модель вернула пустой результат', { status: 502 });
    }

    const { data: inserted, error: insErr } = await sb.from('summaries').insert({
      user_id: user.id,
      file_name: (file as any).name || 'document',
      file_pages: processed.kind === 'text' ? (processed as any).pages ?? null : null,
      file_bytes: processed.bytes,
      file_type: processed.kind === 'text' ? (processed as any).fileType : 'image',
      summary,
      terms,
      simple
    }).select('id').single();

    if (insErr) {
      console.error(insErr);
      return new NextResponse('DB insert error', { status: 500 });
    }

    return NextResponse.json({ id: inserted.id, summary, terms, simple });
  } catch (e: any) {
    if (e?.message === 'LIMIT_REACHED') return new NextResponse('Лимит в 20 загрузок исчерпан', { status: 429 });
    console.error(e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function safeGuessJSON(s: string) {
  try { return JSON.parse(s); } catch {}
  // выдернем JSON-блок из текста
  const m = s.match(/\{[\s\S]*\}$/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return { summary: s };
}
