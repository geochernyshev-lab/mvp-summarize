// @ts-nocheck
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processFile } from '@/lib/processFile';
import { ensureQuotaAndIncrement } from '@/lib/rateLimit';
import { openai } from '@/lib/openai';
import fs from 'fs';

// страховка от старого dev-кода Next (не влияет на прод)
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

function sbWithAuth(authHeader?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || undefined;
  const sb = sbWithAuth(authHeader);

  try {
    // 1) авторизация пользователя
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    // 2) квота (20 загрузок)
    await ensureQuotaAndIncrement(sb, user.id);

    // 3) принимаем файл и режимы
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const modesRaw = form.get('modes') as string | null;
    if (!file) return new NextResponse('No file', { status: 400 });

    const mime = file.type;
    const supported = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg','image/jpg','image/png','image/heic','image/heif'
    ];
    if (!supported.includes(mime)) {
      return new NextResponse('Поддерживаются: PDF, DOCX, JPEG/JPG, PNG, HEIC', { status: 400 });
    }
    if (file.size > 4_800_000) return new NextResponse('Файл слишком большой (~4.8MB макс)', { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processFile(buffer, mime);

    // 4) ЛИМИТ ТОЛЬКО ДЛЯ PDF
    if (mime === 'application/pdf') {
      const pages = (processed as any).pages || 0;
      if (pages > 5) return new NextResponse('PDF должен содержать не более 5 страниц', { status: 400 });
    }

    // 5) какие выдачи хотел юзер
    let want = { summary: true, terms: false, simple: false };
    if (modesRaw) { try { want = { ...want, ...JSON.parse(modesRaw) }; } catch {} }
    const keys = Object.entries(want).filter(([,v])=>v).map(([k])=>k);
    if (keys.length === 0) keys.push('summary');

    // 6) подсказки для модели
    const system = `You are an expert study assistant. Output must be in the document's language.
Return ONLY JSON with possible keys among: "summary", "terms", "simple".
- "summary": concise gist (6–10 bullets or tight paragraph)
- "terms": a short glossary as Markdown table: | Термин | Объяснение | (5–15 entries)
- "simple": explain the core idea simply (<= 10 sentences).
No external facts. Keep names/numbers.`;

    const messages: any[] = [{ role: 'system', content: system }];

    if (processed.kind === 'text') {
      const text = processed.text.slice(0, 20000);
      messages.push({ role: 'user', content: [{ type:'text', text: `Generate JSON with keys: ${keys.join(', ')}.\nDocument:\n"""${text}"""` }] });
    } else {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Generate JSON with keys: ${keys.join(', ')}. The input is an image of a document.` },
          { type: 'image_url', image_url: { url: processed.dataUrl } }
        ]
      });
    }

    // 7) запрос к модели
    let out = { summary: undefined, terms: undefined, simple: undefined } as any;
    try {
      const resp = await openai.chat.completions.create({
        model: MODEL, temperature: 0.2, response_format: { type: 'json_object' as any }, messages,
      });
      out = JSON.parse(resp.choices[0]?.message?.content?.trim() || '{}');
    } catch (e) {
      const resp = await openai.chat.completions.create({ model: MODEL, temperature: 0.2, messages });
      out = safeJSON(resp.choices[0]?.message?.content?.trim() || '');
    }

    const summary = want.summary ? (out.summary || null) : null;
    const terms   = want.terms   ? (out.terms   || null) : null;
    const simple  = want.simple  ? (out.simple  || null) : null;

    if (!summary && !terms && !simple) return new NextResponse('Пустой ответ модели', { status: 502 });

    // 8) вставка строки истории
    const { data: inserted, error: insErr } = await sb.from('summaries').insert({
      user_id: user.id,
      file_name: (file as any).name || 'document',
      file_pages: mime === 'application/pdf' ? ((processed as any).pages ?? null) : null,
      file_bytes: buffer.byteLength,
      file_type: mime === 'application/pdf' ? 'pdf'
               : mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx'
               : 'image',
      summary, terms, simple
    }).select('id').single();

    if (insErr) {
      // вернём текст ошибки для диагностики
      return NextResponse.json({ error: 'DB insert error', details: insErr.message || insErr }, { status: 500 });
    }

    return NextResponse.json({ id: inserted.id, summary, terms, simple });
  } catch (e: any) {
    if (e?.message === 'LIMIT_REACHED') return new NextResponse('Лимит в 20 загрузок исчерпан', { status: 429 });
    return NextResponse.json({ error: 'Internal Server Error', details: e?.message || String(e) }, { status: 500 });
  }
}

function safeJSON(s: string) {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}$/); if (m) { try { return JSON.parse(m[0]); } catch {} }
  return { summary: s };
}
