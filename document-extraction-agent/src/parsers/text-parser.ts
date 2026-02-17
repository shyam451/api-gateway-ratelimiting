import * as fs from 'fs';
import * as path from 'path';
import { ParsedDocument } from './pdf-parser';

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.rst', '.log',
  '.xml', '.html', '.htm', '.yaml', '.yml', '.toml',
  '.ini', '.cfg', '.conf',
]);

const JSON_EXTENSIONS = new Set(['.json', '.jsonl', '.geojson']);

/**
 * Parse a plain text file.
 */
export async function parseText(filePath: string): Promise<ParsedDocument> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const ext = path.extname(absolutePath).toLowerCase();
  const lineCount = content.split('\n').length;

  return {
    text: content,
    metadata: {
      file_type: ext || 'text',
      line_count: lineCount,
      character_count: content.length,
      encoding: 'utf-8',
    },
  };
}

/**
 * Parse a JSON file and produce a readable text representation.
 */
export async function parseJson(filePath: string): Promise<ParsedDocument> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in file: ${absolutePath}`);
  }

  const formatted = JSON.stringify(parsed, null, 2);
  const isArray = Array.isArray(parsed);
  const topLevelKeys = typeof parsed === 'object' && parsed !== null && !isArray
    ? Object.keys(parsed)
    : [];

  return {
    text: formatted,
    metadata: {
      file_type: 'json',
      is_array: isArray,
      array_length: isArray ? (parsed as unknown[]).length : 0,
      top_level_keys: topLevelKeys.join(', '),
      character_count: content.length,
    },
  };
}

/**
 * Check if a file extension is a supported text format.
 */
export function isTextFormat(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Check if a file extension is a supported JSON format.
 */
export function isJsonFormat(ext: string): boolean {
  return JSON_EXTENSIONS.has(ext.toLowerCase());
}
