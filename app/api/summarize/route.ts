import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/db';
import { parsePdf } from '@/lib/pdf';
import { openai } from '@/lib/openai';
import { ensureQuotaAndIncrement } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const sb = serverSupabase();
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return new NextResponse('Unauthorized', { status: 401 });

    await ensureQuotaAndIncrement();

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return new NextResponse('No file', { status: 400 });
    if (file.type !== 'application/pdf') return new NextResponse('Только PDF', { status: 400 });
    if (file.size > 4_500_000) return new NextResponse('Файл слишком большой (макс ~4.5MB)', { status: 413 });

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const { pages, bytes, text } = await parsePdf(buffer);
    if (pages === 0 || !text) return new NextResponse('Не удалось извлечь текст из PDF', { status: 400 });
    if (pages > 5) return new NextResponse('PDF должен содержать не более 5 страниц', { status: 400 });

    const prompt = `You are a professional summarizer. The input is plain text extracted from a PDF.
1) Detect the dominant language of the document.
2) Return a concise summary (6–10 bullet points max, or a short paragraph if better) in the same language as the document.
3) Preserve key terms, acronyms, numbers, and entities.
4) Do not add external facts.

Document text (may include line breaks):
"""${text.slice(0, 20000)}"""`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You summarize documents succinctly and accurately.' },
        { role: 'user', content: prompt }
      ]
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) return new NextResponse('OpenAI error: empty summary', { status: 502 });

    const { error: insErr } = await sb.from('summaries').insert({
      user_id: user.id,
      file_name: (file as any).name || 'document.pdf',
      file_pages: pages,
      file_bytes: bytes,
      summary
    });
    if (insErr) console.error(insErr);

    return NextResponse.json({ summary });
  } catch (e: any) {
    if (e?.message === 'LIMIT_REACHED') {
      return new NextResponse('Лимит в 20 загрузок исчерпан', { status: 429 });
    }
    console.error(e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
