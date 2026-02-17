/**
 * Schemas for document extraction output structures.
 */

export interface ExtractedField {
  name: string;
  value: string | number | boolean | null;
  confidence: number;
  source_location?: string;
}

export interface ExtractedTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface ExtractedSection {
  heading: string;
  content: string;
  fields: ExtractedField[];
  tables: ExtractedTable[];
}

export interface ExtractionResult {
  document_type: string;
  source_file: string;
  extracted_at: string;
  summary: string;
  sections: ExtractedSection[];
  metadata: Record<string, string | number | boolean>;
  raw_text_length: number;
}

export interface ExtractionRequest {
  file_path: string;
  extraction_schema?: string;
  output_format: 'json' | 'markdown' | 'csv';
  include_raw_text: boolean;
}

export const EXTRACTION_SCHEMA_TOOL = {
  name: 'extract_document',
  description:
    'Extract structured data from a document file. Supports PDF, CSV, JSON, and plain text files. ' +
    'Returns extracted fields, tables, sections, and metadata in a structured format.',
  input_schema: {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the document file to extract data from.',
      },
      extraction_schema: {
        type: 'string',
        description:
          'Optional natural language description of what fields/data to extract. ' +
          'E.g., "Extract invoice number, date, line items, and total amount".',
      },
      output_format: {
        type: 'string',
        enum: ['json', 'markdown', 'csv'],
        description: 'Format for the extraction output. Defaults to json.',
      },
      include_raw_text: {
        type: 'boolean',
        description: 'Whether to include the raw extracted text in the output. Defaults to false.',
      },
    },
    required: ['file_path'],
  },
};

export const LIST_SUPPORTED_FORMATS_TOOL = {
  name: 'list_supported_formats',
  description: 'List all document formats supported by the extraction agent.',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export const VALIDATE_DOCUMENT_TOOL = {
  name: 'validate_document',
  description: 'Check if a file is a supported document format and can be processed for extraction.',
  input_schema: {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the file to validate.',
      },
    },
    required: ['file_path'],
  },
};
