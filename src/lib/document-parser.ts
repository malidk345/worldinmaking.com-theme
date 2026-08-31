import { extractTextFromPdf } from './pdf-parser';

export interface ParsedDocumentResult {
  type: 'pdf' | 'csv' | 'json' | 'code' | 'text' | 'image';
  content: string;
  preview: string;
  pageCount?: number;
  summary?: string;
}

/**
 * Converts raw CSV data into a clean Markdown table, saving tokens and improving LLM factual reasoning.
 */
export function formatCsvToMarkdown(csvText: string, maxRows = 60): string {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '';
  const rows = lines.slice(0, maxRows).map((line) => {
    const cells = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
    return cells;
  });

  if (rows.length === 0) return '';
  const header = rows[0];
  const divider = header.map(() => '---');
  const mdRows = [
    `| ${header.join(' | ')} |`,
    `| ${divider.join(' | ')} |`,
    ...rows.slice(1).map((r) => `| ${r.join(' | ')} |`),
  ];
  return mdRows.join('\n');
}

/**
 * Token-optimized document parser for uploaded files.
 */
export async function parseDocumentFile(file: File): Promise<ParsedDocumentResult> {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
  const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
  const isJson = file.type === 'application/json' || file.name.endsWith('.json');
  const isCode = /\.(js|ts|tsx|jsx|py|html|css|sql|sh|rs|go|c|cpp|md)$/i.test(file.name);

  if (isImage) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          type: 'image',
          content: dataUrl,
          preview: '[Image attachment]',
        });
      };
      reader.readAsDataURL(file);
    });
  }

  if (isPdf) {
    const pdfText = await extractTextFromPdf(file);
    return {
      type: 'pdf',
      content: pdfText,
      preview: pdfText.slice(0, 200),
    };
  }

  const rawText = await file.text();

  if (isCsv) {
    const mdTable = formatCsvToMarkdown(rawText);
    return {
      type: 'csv',
      content: `[CSV Table: ${file.name}]\n${mdTable}`,
      preview: mdTable.slice(0, 200),
    };
  }

  if (isJson) {
    try {
      const parsed = JSON.parse(rawText);
      const formatted = JSON.stringify(parsed, null, 2);
      return {
        type: 'json',
        content: `[JSON: ${file.name}]\n${formatted.slice(0, 14000)}`,
        preview: formatted.slice(0, 200),
      };
    } catch (_) {}
  }

  const cleanText = rawText.slice(0, 16000);
  return {
    type: isCode ? 'code' : 'text',
    content: `[File: ${file.name}]\n${cleanText}`,
    preview: cleanText.slice(0, 200),
  };
}
