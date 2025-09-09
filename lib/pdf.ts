// lib/pdf.ts
export async function parsePdf(buffer: Buffer): Promise<{ pages: number; bytes: number; text: string }> {
  // Ленивая загрузка модуля только во время запроса (а не на сборке)
  const mod: any = await import('pdf-parse');
  const pdf = mod.default ?? mod;

  const data = await pdf(buffer);
  const pages = (data?.numpages as number) || 0;
  const text = (data?.text ? String(data.text) : '').replace(/\s+\n/g, '\n').trim();
  return { pages, bytes: buffer.byteLength, text };
}
