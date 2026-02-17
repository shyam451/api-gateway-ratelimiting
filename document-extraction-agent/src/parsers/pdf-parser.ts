import * as fs from 'fs';
import * as path from 'path';

export interface ParsedDocument {
  text: string;
  metadata: Record<string, string | number | boolean>;
  page_count?: number;
}

/**
 * Parse a PDF file and extract its text content.
 */
export async function parsePdf(filePath: string): Promise<ParsedDocument> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const buffer = fs.readFileSync(absolutePath);

  try {
    // Dynamic import to handle optional dependency
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);

    return {
      text: data.text,
      metadata: {
        title: data.info?.Title || '',
        author: data.info?.Author || '',
        subject: data.info?.Subject || '',
        creator: data.info?.Creator || '',
        producer: data.info?.Producer || '',
        page_count: data.numpages,
        pdf_version: data.version || '',
      },
      page_count: data.numpages,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      throw new Error(
        'pdf-parse is not installed. Run: npm install pdf-parse'
      );
    }
    throw new Error(`Failed to parse PDF: ${(error as Error).message}`);
  }
}
