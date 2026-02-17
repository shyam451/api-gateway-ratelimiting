import Anthropic from '@anthropic-ai/sdk';
import {
  EXTRACTION_SCHEMA_TOOL,
  LIST_SUPPORTED_FORMATS_TOOL,
  VALIDATE_DOCUMENT_TOOL,
} from './schemas/extraction-schema';
import {
  handleExtractDocument,
  handleListSupportedFormats,
  handleValidateDocument,
} from './tools/tool-handlers';

const SYSTEM_PROMPT = `You are a document extraction agent. Your purpose is to extract structured data from documents provided by the user.

Your capabilities:
1. Extract text, tables, fields, and metadata from documents (PDF, CSV, JSON, text files)
2. Identify and structure key information based on user-specified schemas
3. Validate documents before processing
4. Output extracted data in JSON, Markdown, or CSV formats

When a user asks you to extract data from a document:
1. First validate the document using validate_document
2. Then extract the content using extract_document
3. If the user specifies particular fields or data points to extract, use the extraction_schema parameter
4. Present the results clearly and offer to re-extract with different parameters if needed

Always explain what you found and highlight any issues or limitations in the extraction.`;

export interface AgentConfig {
  model?: string;
  maxTurns?: number;
  apiKey?: string;
}

type ToolResultContent = Array<{ type: 'text'; text: string }>;

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface TextBlock {
  type: 'text';
  text: string;
}

type ContentBlock = ToolUseBlock | TextBlock;

/**
 * Document Extraction Agent built on the Claude Agent SDK pattern.
 * Uses an agentic tool-use loop to process documents and extract structured data.
 */
export class DocumentExtractionAgent {
  private client: Anthropic;
  private model: string;
  private maxTurns: number;

  constructor(config: AgentConfig = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTurns = config.maxTurns || 10;
  }

  /**
   * Run the agent with a user message. Executes the agentic loop:
   * send message -> check for tool calls -> execute tools -> respond with results -> repeat
   */
  async run(userMessage: string): Promise<string> {
    const tools = [
      EXTRACTION_SCHEMA_TOOL,
      LIST_SUPPORTED_FORMATS_TOOL,
      VALIDATE_DOCUMENT_TOOL,
    ];

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    let turns = 0;

    while (turns < this.maxTurns) {
      turns++;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: tools as Anthropic.Tool[],
        messages,
      });

      // If the model stops without tool use, return the text response
      if (response.stop_reason === 'end_turn') {
        return this.extractTextFromResponse(response.content as ContentBlock[]);
      }

      // Process tool calls
      const toolUseBlocks = (response.content as ContentBlock[]).filter(
        (block): block is ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        return this.extractTextFromResponse(response.content as ContentBlock[]);
      }

      // Add assistant message with tool use
      messages.push({
        role: 'assistant',
        content: response.content as Anthropic.ContentBlock[],
      });

      // Execute each tool and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await this.executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add tool results to messages
      messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    return 'Agent reached maximum number of turns without completing the task.';
  }

  /**
   * Execute a tool by name with the given input.
   */
  private async executeTool(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<ToolResultContent> {
    let result: string;

    try {
      switch (toolName) {
        case 'extract_document':
          result = await handleExtractDocument(input as {
            file_path: string;
            extraction_schema?: string;
            output_format?: string;
            include_raw_text?: boolean;
          });
          break;

        case 'list_supported_formats':
          result = handleListSupportedFormats();
          break;

        case 'validate_document':
          result = handleValidateDocument(input as { file_path: string });
          break;

        default:
          result = JSON.stringify({ error: true, message: `Unknown tool: ${toolName}` });
      }
    } catch (error) {
      result = JSON.stringify({
        error: true,
        message: `Tool execution failed: ${(error as Error).message}`,
      });
    }

    return [{ type: 'text', text: result }];
  }

  /**
   * Extract text content from response blocks.
   */
  private extractTextFromResponse(content: ContentBlock[]): string {
    return content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }
}
