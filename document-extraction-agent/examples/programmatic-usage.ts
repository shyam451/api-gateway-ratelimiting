/**
 * Programmatic usage example showing how to use the document parsers
 * directly without the full agent loop (no API key required).
 *
 * Run:
 *   npx ts-node examples/programmatic-usage.ts
 */

import * as path from 'path';
import { parseDocument, validateDocument, SUPPORTED_FORMATS } from '../src/parsers';
import { handleExtractDocument, handleListSupportedFormats } from '../src/tools/tool-handlers';

async function main() {
  const sampleFile = path.join(__dirname, 'sample-invoice.txt');

  // 1. Validate a document
  console.log('=== Document Validation ===\n');
  const validation = validateDocument(sampleFile);
  console.log('Validation result:', JSON.stringify(validation, null, 2));

  // 2. Parse a document directly
  console.log('\n=== Direct Parsing ===\n');
  const parsed = await parseDocument(sampleFile);
  console.log('Metadata:', JSON.stringify(parsed.metadata, null, 2));
  console.log('Text preview:', parsed.text.substring(0, 200) + '...');

  // 3. Use the tool handler for structured extraction
  console.log('\n=== Structured Extraction (JSON) ===\n');
  const jsonResult = await handleExtractDocument({
    file_path: sampleFile,
    output_format: 'json',
  });
  const jsonParsed = JSON.parse(jsonResult);
  console.log('Document type:', jsonParsed.document_type);
  console.log('Summary:', jsonParsed.summary);
  console.log('Fields:', jsonParsed.sections[0].fields.length);

  // 4. Extract as Markdown
  console.log('\n=== Structured Extraction (Markdown) ===\n');
  const mdResult = await handleExtractDocument({
    file_path: sampleFile,
    output_format: 'markdown',
  });
  console.log(mdResult.substring(0, 500) + '...');

  // 5. List supported formats
  console.log('\n=== Supported Formats ===\n');
  const formats = handleListSupportedFormats();
  console.log(formats);
}

main().catch(console.error);
