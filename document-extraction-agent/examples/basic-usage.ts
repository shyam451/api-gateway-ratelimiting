/**
 * Basic usage example for the Document Extraction Agent.
 *
 * Prerequisites:
 *   - Set ANTHROPIC_API_KEY environment variable
 *   - npm install in the document-extraction-agent directory
 *
 * Run:
 *   npx ts-node examples/basic-usage.ts
 */

import { DocumentExtractionAgent } from '../src';

async function main() {
  // Initialize the agent with default settings
  const agent = new DocumentExtractionAgent({
    model: 'claude-sonnet-4-20250514',
    maxTurns: 5,
  });

  // Example 1: Extract from a text file
  console.log('=== Example 1: Text File Extraction ===\n');
  const textResult = await agent.run(
    'Extract all key information from the file at ./examples/sample-invoice.txt and output as JSON'
  );
  console.log(textResult);

  // Example 2: List supported formats
  console.log('\n=== Example 2: List Supported Formats ===\n');
  const formatsResult = await agent.run('What document formats do you support?');
  console.log(formatsResult);

  // Example 3: Extract with a specific schema
  console.log('\n=== Example 3: Schema-Based Extraction ===\n');
  const schemaResult = await agent.run(
    'Extract data from ./examples/sample-invoice.txt. ' +
    'I specifically need: invoice number, date, vendor name, line items with prices, and total amount. ' +
    'Output as markdown.'
  );
  console.log(schemaResult);
}

main().catch(console.error);
