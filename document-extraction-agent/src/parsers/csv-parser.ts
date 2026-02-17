import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { ParsedDocument } from './pdf-parser';

/**
 * Parse a CSV file and extract its content as structured text.
 */
export async function parseCsv(filePath: string): Promise<ParsedDocument> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const records: string[][] = parse(content, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (records.length === 0) {
    return {
      text: '',
      metadata: {
        row_count: 0,
        column_count: 0,
        has_headers: false,
      },
    };
  }

  const headers = records[0];
  const dataRows = records.slice(1);

  // Build a readable text representation
  const textLines: string[] = [];
  textLines.push(`Headers: ${headers.join(' | ')}`);
  textLines.push('---');

  for (const row of dataRows) {
    const rowText = headers
      .map((header, i) => `${header}: ${row[i] ?? ''}`)
      .join(', ');
    textLines.push(rowText);
  }

  return {
    text: textLines.join('\n'),
    metadata: {
      row_count: dataRows.length,
      column_count: headers.length,
      has_headers: true,
      headers: headers.join(', '),
    },
  };
}
