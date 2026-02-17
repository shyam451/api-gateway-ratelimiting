import * as fs from 'fs';
import * as path from 'path';
import {
  handleExtractDocument,
  handleListSupportedFormats,
  handleValidateDocument,
} from '../src/tools/tool-handlers';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

beforeAll(() => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'invoice.txt'),
    `INVOICE #12345
Date: 2024-01-15
Vendor: Acme Corp

Items:
  Widget A - $100.00
  Widget B - $250.00
  Service Fee - $50.00

Subtotal: $400.00
Tax (10%): $40.00
Total: $440.00`
  );

  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'data.csv'),
    `id,name,value,date
1,Revenue,50000,2024-01-01
2,Expenses,30000,2024-01-01
3,Revenue,55000,2024-02-01
4,Expenses,32000,2024-02-01`
  );

  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'config.json'),
    JSON.stringify({
      database: { host: 'localhost', port: 5432, name: 'mydb' },
      api: { version: 'v2', rate_limit: 100 },
    }, null, 2)
  );
});

afterAll(() => {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true });
  }
});

describe('handleExtractDocument', () => {
  test('extracts from text file in JSON format', async () => {
    const result = await handleExtractDocument({
      file_path: path.join(FIXTURES_DIR, 'invoice.txt'),
      output_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toBeUndefined();
    expect(parsed.document_type).toBe('Plain text files');
    expect(parsed.source_file).toContain('invoice.txt');
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].content).toContain('INVOICE #12345');
  });

  test('extracts from CSV file in JSON format', async () => {
    const result = await handleExtractDocument({
      file_path: path.join(FIXTURES_DIR, 'data.csv'),
      output_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toBeUndefined();
    expect(parsed.document_type).toBe('Comma-separated values');
    expect(parsed.metadata.row_count).toBe(4);
  });

  test('extracts in markdown format', async () => {
    const result = await handleExtractDocument({
      file_path: path.join(FIXTURES_DIR, 'invoice.txt'),
      output_format: 'markdown',
    });

    expect(result).toContain('# Document Extraction Report');
    expect(result).toContain('Plain text files');
    expect(result).toContain('invoice.txt');
  });

  test('extracts in CSV format', async () => {
    const result = await handleExtractDocument({
      file_path: path.join(FIXTURES_DIR, 'config.json'),
      output_format: 'csv',
    });

    expect(result).toContain('field_name,field_value,confidence,section');
    expect(result).toContain('json');
  });

  test('includes raw text when requested', async () => {
    const result = await handleExtractDocument({
      file_path: path.join(FIXTURES_DIR, 'invoice.txt'),
      output_format: 'json',
      include_raw_text: true,
    });

    const parsed = JSON.parse(result);
    expect(parsed.raw_text).toBeDefined();
    expect(parsed.raw_text).toContain('INVOICE #12345');
  });

  test('returns error for non-existent file', async () => {
    const result = await handleExtractDocument({
      file_path: '/nonexistent/file.txt',
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toBe(true);
    expect(parsed.message).toContain('Cannot process file');
  });
});

describe('handleListSupportedFormats', () => {
  test('returns list of supported formats', () => {
    const result = handleListSupportedFormats();
    const parsed = JSON.parse(result);

    expect(parsed.supported_formats).toBeDefined();
    expect(parsed.total_count).toBeGreaterThan(0);

    const extensions = parsed.supported_formats.map(
      (f: { extension: string }) => f.extension
    );
    expect(extensions).toContain('.pdf');
    expect(extensions).toContain('.csv');
    expect(extensions).toContain('.json');
    expect(extensions).toContain('.txt');
  });
});

describe('handleValidateDocument', () => {
  test('validates existing file', () => {
    const result = handleValidateDocument({
      file_path: path.join(FIXTURES_DIR, 'invoice.txt'),
    });

    const parsed = JSON.parse(result);
    expect(parsed.valid).toBe(true);
    expect(parsed.format).toBe('Plain text files');
  });

  test('returns invalid for missing file', () => {
    const result = handleValidateDocument({
      file_path: '/nonexistent/file.txt',
    });

    const parsed = JSON.parse(result);
    expect(parsed.valid).toBe(false);
  });
});
