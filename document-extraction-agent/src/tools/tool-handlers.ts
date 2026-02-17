import { parseDocument, validateDocument, SUPPORTED_FORMATS, ParsedDocument } from '../parsers';
import { ExtractionResult, ExtractionRequest } from '../schemas/extraction-schema';

/**
 * Handle the extract_document tool call.
 * Parses the document and returns structured extraction results.
 */
export async function handleExtractDocument(input: {
  file_path: string;
  extraction_schema?: string;
  output_format?: string;
  include_raw_text?: boolean;
}): Promise<string> {
  const {
    file_path,
    extraction_schema,
    output_format = 'json',
    include_raw_text = false,
  } = input;

  // Validate first
  const validation = validateDocument(file_path);
  if (!validation.valid) {
    return JSON.stringify({
      error: true,
      message: `Cannot process file: ${validation.reason}`,
    });
  }

  // Parse the document
  let parsed: ParsedDocument;
  try {
    parsed = await parseDocument(file_path);
  } catch (error) {
    return JSON.stringify({
      error: true,
      message: `Failed to parse document: ${(error as Error).message}`,
    });
  }

  // Build extraction result
  const result: ExtractionResult = {
    document_type: validation.format,
    source_file: file_path,
    extracted_at: new Date().toISOString(),
    summary: `Extracted content from ${validation.format} file (${parsed.text.length} characters)`,
    sections: [
      {
        heading: 'Document Content',
        content: parsed.text.substring(0, 5000),
        fields: Object.entries(parsed.metadata).map(([name, value]) => ({
          name,
          value,
          confidence: 1.0,
        })),
        tables: [],
      },
    ],
    metadata: parsed.metadata,
    raw_text_length: parsed.text.length,
  };

  if (output_format === 'markdown') {
    return formatAsMarkdown(result, include_raw_text ? parsed.text : undefined);
  }

  if (output_format === 'csv') {
    return formatAsCsv(result);
  }

  // Default: JSON
  const jsonResult: Record<string, unknown> = { ...result };
  if (include_raw_text) {
    jsonResult.raw_text = parsed.text;
  }
  return JSON.stringify(jsonResult, null, 2);
}

/**
 * Handle the list_supported_formats tool call.
 */
export function handleListSupportedFormats(): string {
  const formats = Object.entries(SUPPORTED_FORMATS).map(([ext, desc]) => ({
    extension: ext,
    description: desc,
  }));

  return JSON.stringify({
    supported_formats: formats,
    total_count: formats.length,
  }, null, 2);
}

/**
 * Handle the validate_document tool call.
 */
export function handleValidateDocument(input: { file_path: string }): string {
  const result = validateDocument(input.file_path);
  return JSON.stringify(result, null, 2);
}

/**
 * Format extraction result as Markdown.
 */
function formatAsMarkdown(result: ExtractionResult, rawText?: string): string {
  const lines: string[] = [];

  lines.push(`# Document Extraction Report`);
  lines.push('');
  lines.push(`- **Document Type:** ${result.document_type}`);
  lines.push(`- **Source File:** ${result.source_file}`);
  lines.push(`- **Extracted At:** ${result.extracted_at}`);
  lines.push(`- **Content Length:** ${result.raw_text_length} characters`);
  lines.push('');

  lines.push('## Summary');
  lines.push(result.summary);
  lines.push('');

  lines.push('## Metadata');
  for (const [key, value] of Object.entries(result.metadata)) {
    lines.push(`- **${key}:** ${value}`);
  }
  lines.push('');

  for (const section of result.sections) {
    lines.push(`## ${section.heading}`);
    lines.push('');

    if (section.fields.length > 0) {
      lines.push('### Fields');
      lines.push('| Field | Value | Confidence |');
      lines.push('|-------|-------|------------|');
      for (const field of section.fields) {
        lines.push(`| ${field.name} | ${field.value} | ${field.confidence} |`);
      }
      lines.push('');
    }

    if (section.tables.length > 0) {
      for (const table of section.tables) {
        if (table.title) lines.push(`### ${table.title}`);
        lines.push(`| ${table.headers.join(' | ')} |`);
        lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
        for (const row of table.rows) {
          lines.push(`| ${row.join(' | ')} |`);
        }
        lines.push('');
      }
    }

    if (section.content) {
      lines.push('### Content Preview');
      lines.push('```');
      lines.push(section.content.substring(0, 2000));
      lines.push('```');
      lines.push('');
    }
  }

  if (rawText) {
    lines.push('## Raw Text');
    lines.push('```');
    lines.push(rawText);
    lines.push('```');
  }

  return lines.join('\n');
}

/**
 * Format extraction result as CSV.
 */
function formatAsCsv(result: ExtractionResult): string {
  const lines: string[] = [];

  lines.push('field_name,field_value,confidence,section');

  // Add metadata as fields
  for (const [key, value] of Object.entries(result.metadata)) {
    const escapedValue = String(value).replace(/"/g, '""');
    lines.push(`"${key}","${escapedValue}",1.0,"metadata"`);
  }

  // Add extracted fields
  for (const section of result.sections) {
    for (const field of section.fields) {
      const escapedValue = String(field.value).replace(/"/g, '""');
      lines.push(`"${field.name}","${escapedValue}",${field.confidence},"${section.heading}"`);
    }
  }

  return lines.join('\n');
}
