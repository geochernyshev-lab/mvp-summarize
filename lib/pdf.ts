// lib/pdf.ts
export async function parsePdf(buffer: Buffer): Promise<{ pages: number; bytes: number; text: string }> {
  const mod: any = await import('pdf-parse');         // динамический импорт
  const pdf = mod.default ?? mod;
  const data = await pdf(buffer);                     // парсим присланный файл
  const pages = (data?.numpages as number) || 0;
  const text = (data?.text ? String(data.text) : '')
    .replace(/\s+\n/g, '\n')
    .trim();
  return { pages, bytes: buffer.byteLength, text };
}
