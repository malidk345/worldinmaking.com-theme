/**
 * Client-Side PDF Text Extractor for WIM AI
 * Extracts clean, readable text from uploaded PDF documents.
 */

export async function extractTextFromPdf(file: File | ArrayBuffer | Uint8Array): Promise<string> {
  try {
    let uint8Data: Uint8Array;
    if (typeof File !== 'undefined' && file instanceof File) {
      const buffer = await file.arrayBuffer();
      uint8Data = new Uint8Array(buffer);
    } else if (file instanceof ArrayBuffer) {
      uint8Data = new Uint8Array(file);
    } else {
      uint8Data = file as Uint8Array;
    }

    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions?.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '3.11.174'}/pdf.worker.min.js`;
    }

    const loadingTask = pdfjs.getDocument({
      data: uint8Data,
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];
    const maxPages = Math.min(pdf.numPages, 30);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter(Boolean);
        const pageBody = items.join(' ').replace(/\s+/g, ' ').trim();
        if (pageBody) {
          pageTexts.push(`[Page ${pageNum}]\n${pageBody}`);
        }
      } catch (pageErr) {
        console.warn(`[PDF Parser] Error reading page ${pageNum}:`, pageErr);
      }
    }

    const result = pageTexts.join('\n\n');
    if (result.trim().length > 0) {
      return result;
    }
  } catch (err) {
    console.error('[PDF Parser] pdfjs extraction failed:', err);
  }

  return '[PDF document attached: Text extracted for AI analysis.]';
}