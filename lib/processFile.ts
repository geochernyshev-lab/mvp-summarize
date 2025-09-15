// lib/processFile.ts
import { parsePdf } from '@/lib/pdf';
import mammoth from 'mammoth';
import sharp from 'sharp';

export type Processed =
  | { kind: 'text'; text: string; pages?: number; bytes: number; fileType: string }
  | { kind: 'image'; dataUrl: string; bytes: number; fileType: string };

export async function processFile(buffer: Buffer, mime: string): Promise<Processed> {
  const bytes = buffer.byteLength;

  if (mime === 'application/pdf') {
    const { pages, text } = await parsePdf(buffer);
    return { kind: 'text', text, pages, bytes, fileType: 'pdf' };
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { value } = await mammoth.convertToHtml({ buffer }); // HTML -> дальше в текст
    const plain = htmlToText(value);
    return { kind: 'text', text: plain, bytes, fileType: 'docx' };
  }

  if (mime.startsWith('image/')) {
    // HEIC/HEIF -> JPEG
    let img = buffer;
    if (mime === 'image/heic' || mime === 'image/heif') {
      img = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      mime = 'image/jpeg';
    }
    const b64 = img.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;
    return { kind: 'image', dataUrl, bytes, fileType: mime.split('/')[1] };
  }

  throw new Error('Неподдерживаемый формат файла');
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
