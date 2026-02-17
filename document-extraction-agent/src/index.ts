#!/usr/bin/env node

import { DocumentExtractionAgent, AgentConfig } from './agent';

// Re-export for library usage
export { DocumentExtractionAgent, AgentConfig } from './agent';
export { ExtractionResult, ExtractionRequest } from './schemas/extraction-schema';
export { ParsedDocument } from './parsers';
export { parseDocument, validateDocument, SUPPORTED_FORMATS } from './parsers';

/**
 * CLI entry point for the document extraction agent.
 *
 * Usage:
 *   npx ts-node src/index.ts "Extract data from /path/to/document.pdf"
 *   npx ts-node src/index.ts --file /path/to/document.csv
 *   npx ts-node src/index.ts --file /path/to/doc.json --schema "Extract all user records"
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  // Parse arguments
  let userMessage: string;
  const fileIndex = args.indexOf('--file');
  const schemaIndex = args.indexOf('--schema');
  const formatIndex = args.indexOf('--format');
  const modelIndex = args.indexOf('--model');

  const model = modelIndex !== -1 ? args[modelIndex + 1] : undefined;

  if (fileIndex !== -1) {
    const filePath = args[fileIndex + 1];
    if (!filePath) {
      console.error('Error: --file requires a path argument');
      process.exit(1);
    }

    const schema = schemaIndex !== -1 ? args[schemaIndex + 1] : '';
    const format = formatIndex !== -1 ? args[formatIndex + 1] : 'json';

    userMessage = `Extract data from the file at: ${filePath}`;
    if (schema) {
      userMessage += `\n\nSpecifically, I need: ${schema}`;
    }
    userMessage += `\n\nPlease output in ${format} format.`;
  } else {
    // Treat all non-flag args as the user message
    userMessage = args.filter((a) => !a.startsWith('--')).join(' ');
  }

  if (!userMessage.trim()) {
    console.error('Error: No message or file path provided');
    printUsage();
    process.exit(1);
  }

  const config: AgentConfig = {};
  if (model) config.model = model;

  const agent = new DocumentExtractionAgent(config);

  try {
    console.log('Document Extraction Agent starting...\n');
    const result = await agent.run(userMessage);
    console.log(result);
  } catch (error) {
    console.error(`Agent error: ${(error as Error).message}`);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Document Extraction Agent - Claude Agent SDK Skill

Usage:
  npx ts-node src/index.ts <message>
  npx ts-node src/index.ts --file <path> [--schema <description>] [--format <json|markdown|csv>]

Options:
  --file <path>       Path to the document to extract data from
  --schema <desc>     Natural language description of what to extract
  --format <fmt>      Output format: json (default), markdown, or csv
  --model <model>     Claude model to use (default: claude-sonnet-4-20250514)
  --help, -h          Show this help message

Examples:
  npx ts-node src/index.ts "Extract all fields from /tmp/invoice.pdf"
  npx ts-node src/index.ts --file ./data/report.csv --schema "Get all revenue figures"
  npx ts-node src/index.ts --file ./config.json --format markdown

Supported Formats:
  PDF (.pdf), CSV (.csv), JSON (.json, .jsonl), Text (.txt, .md),
  XML (.xml), HTML (.html), YAML (.yaml, .yml), TOML (.toml),
  Log files (.log), Config files (.ini, .cfg, .conf)
  `);
}

// Run CLI if executed directly
if (require.main === module) {
  main();
}
