declare module 'pdf-parse' {
  interface PdfParseResult {
    numpages: number;
    text: string;
    info?: any;
    metadata?: any;
    version?: string;
  }
  function pdf(buffer: Buffer): Promise<PdfParseResult>;
  export default pdf;
}
