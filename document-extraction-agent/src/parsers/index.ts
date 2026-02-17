import * as path from 'path';
import * as fs from 'fs';
import { ParsedDocument } from './pdf-parser';
import { parsePdf } from './pdf-parser';
import { parseCsv } from './csv-parser';
import { parseText, parseJson, isTextFormat, isJsonFormat } from './text-parser';

export { ParsedDocument } from './pdf-parser';

export const SUPPORTED_FORMATS: Record<string, string> = {
  '.pdf': 'PDF documents',
  '.csv': 'Comma-separated values',
  '.json': 'JSON files',
  '.jsonl': 'JSON Lines files',
  '.txt': 'Plain text files',
  '.md': 'Markdown files',
  '.markdown': 'Markdown files',
  '.xml': 'XML files',
  '.html': 'HTML files',
  '.htm': 'HTML files',
  '.yaml': 'YAML files',
  '.yml': 'YAML files',
  '.toml': 'TOML files',
  '.log': 'Log files',
  '.rst': 'reStructuredText files',
  '.ini': 'INI configuration files',
  '.cfg': 'Configuration files',
  '.conf': 'Configuration files',
};

/**
 * Parse a document file based on its extension.
 */
export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const ext = path.extname(absolutePath).toLowerCase();

  if (ext === '.pdf') {
    return parsePdf(absolutePath);
  }

  if (ext === '.csv') {
    return parseCsv(absolutePath);
  }

  if (isJsonFormat(ext)) {
    return parseJson(absolutePath);
  }

  if (isTextFormat(ext)) {
    return parseText(absolutePath);
  }

  // Attempt to read as text for unknown extensions
  try {
    return parseText(absolutePath);
  } catch {
    throw new Error(
      `Unsupported file format: ${ext}. Supported formats: ${Object.keys(SUPPORTED_FORMATS).join(', ')}`
    );
  }
}

/**
 * Validate whether a file can be processed.
 */
export function validateDocument(filePath: string): {
  valid: boolean;
  format: string;
  reason?: string;
} {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    return { valid: false, format: 'unknown', reason: 'File not found' };
  }

  const stats = fs.statSync(absolutePath);
  if (stats.isDirectory()) {
    return { valid: false, format: 'directory', reason: 'Path is a directory, not a file' };
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const formatDesc = SUPPORTED_FORMATS[ext];

  if (formatDesc) {
    return { valid: true, format: formatDesc };
  }

  // Allow unknown text files with a warning
  return {
    valid: true,
    format: 'unknown (will attempt text extraction)',
    reason: `Extension '${ext}' is not in the supported list but will attempt text parsing`,
  };
}
