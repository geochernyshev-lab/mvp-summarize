import pdf from 'pdf-parse';

export async function parsePdf(buffer: Buffer): Promise<{pages:number; bytes:number; text:string}> {
  const data = await pdf(buffer);
  const pages = (data as any).numpages || 0;
  const text = (data as any).text ? (data as any).text.replace(/\s+\n/g, '\n').trim() : '';
  return { pages, bytes: buffer.byteLength, text };
}
