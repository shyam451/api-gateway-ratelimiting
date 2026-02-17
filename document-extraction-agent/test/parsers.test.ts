import * as fs from 'fs';
import * as path from 'path';
import { parseDocument, validateDocument, SUPPORTED_FORMATS } from '../src/parsers';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Create fixtures directory and test files before tests
beforeAll(() => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  // Create sample text file
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'sample.txt'),
    'Hello World\nThis is a test document.\nLine 3 of the document.'
  );

  // Create sample CSV
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'sample.csv'),
    'name,age,email\nAlice,30,alice@example.com\nBob,25,bob@example.com\nCharlie,35,charlie@example.com'
  );

  // Create sample JSON
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'sample.json'),
    JSON.stringify({
      company: 'Acme Corp',
      employees: [
        { name: 'Alice', role: 'Engineer' },
        { name: 'Bob', role: 'Designer' },
      ],
      founded: 2020,
    }, null, 2)
  );

  // Create sample Markdown
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'sample.md'),
    '# Test Document\n\n## Section 1\n\nSome content here.\n\n## Section 2\n\nMore content.'
  );
});

// Cleanup fixtures after tests
afterAll(() => {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true });
  }
});

describe('validateDocument', () => {
  test('validates existing text file', () => {
    const result = validateDocument(path.join(FIXTURES_DIR, 'sample.txt'));
    expect(result.valid).toBe(true);
    expect(result.format).toBe('Plain text files');
  });

  test('validates existing CSV file', () => {
    const result = validateDocument(path.join(FIXTURES_DIR, 'sample.csv'));
    expect(result.valid).toBe(true);
    expect(result.format).toBe('Comma-separated values');
  });

  test('validates existing JSON file', () => {
    const result = validateDocument(path.join(FIXTURES_DIR, 'sample.json'));
    expect(result.valid).toBe(true);
    expect(result.format).toBe('JSON files');
  });

  test('returns invalid for non-existent file', () => {
    const result = validateDocument('/nonexistent/file.txt');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not found');
  });

  test('handles unknown extension gracefully', () => {
    // Create a file with unknown extension
    const unknownFile = path.join(FIXTURES_DIR, 'data.xyz');
    fs.writeFileSync(unknownFile, 'test data');
    const result = validateDocument(unknownFile);
    expect(result.valid).toBe(true);
    expect(result.format).toContain('unknown');
  });
});

describe('parseDocument', () => {
  test('parses text file', async () => {
    const result = await parseDocument(path.join(FIXTURES_DIR, 'sample.txt'));
    expect(result.text).toContain('Hello World');
    expect(result.text).toContain('Line 3');
    expect(result.metadata.line_count).toBe(3);
  });

  test('parses CSV file', async () => {
    const result = await parseDocument(path.join(FIXTURES_DIR, 'sample.csv'));
    expect(result.text).toContain('name');
    expect(result.text).toContain('Alice');
    expect(result.text).toContain('Bob');
    expect(result.metadata.row_count).toBe(3);
    expect(result.metadata.column_count).toBe(3);
  });

  test('parses JSON file', async () => {
    const result = await parseDocument(path.join(FIXTURES_DIR, 'sample.json'));
    expect(result.text).toContain('Acme Corp');
    expect(result.text).toContain('Alice');
    expect(result.metadata.is_array).toBe(false);
    expect(result.metadata.top_level_keys).toContain('company');
  });

  test('parses Markdown file', async () => {
    const result = await parseDocument(path.join(FIXTURES_DIR, 'sample.md'));
    expect(result.text).toContain('# Test Document');
    expect(result.text).toContain('Section 1');
    expect(result.metadata.file_type).toBe('.md');
  });

  test('throws error for non-existent file', async () => {
    await expect(parseDocument('/nonexistent/file.txt')).rejects.toThrow('File not found');
  });
});

describe('SUPPORTED_FORMATS', () => {
  test('includes PDF format', () => {
    expect(SUPPORTED_FORMATS['.pdf']).toBe('PDF documents');
  });

  test('includes CSV format', () => {
    expect(SUPPORTED_FORMATS['.csv']).toBe('Comma-separated values');
  });

  test('includes JSON format', () => {
    expect(SUPPORTED_FORMATS['.json']).toBe('JSON files');
  });

  test('includes common text formats', () => {
    expect(SUPPORTED_FORMATS['.txt']).toBeDefined();
    expect(SUPPORTED_FORMATS['.md']).toBeDefined();
    expect(SUPPORTED_FORMATS['.xml']).toBeDefined();
    expect(SUPPORTED_FORMATS['.html']).toBeDefined();
    expect(SUPPORTED_FORMATS['.yaml']).toBeDefined();
  });
});
