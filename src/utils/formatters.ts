/**
 * Response Formatting Utilities
 *
 * Helpers for formatting tool responses in JSON or Markdown.
 */

import type {
  Block,
  Comment,
  Database,
  Page,
  PaginatedResponse,
  ResponseFormat,
  RichTextItem,
  User,
} from '../types/entities.js';
import { NotionApiError, formatErrorForLogging } from './errors.js';

/**
 * MCP tool response type
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Format a successful response
 */
export function formatResponse(
  data: unknown,
  format: ResponseFormat,
  entityType: string
): ToolResponse {
  if (format === 'markdown') {
    return {
      content: [{ type: 'text', text: formatAsMarkdown(data, entityType) }],
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Format an error response
 */
export function formatError(error: unknown): ToolResponse {
  const errorInfo = formatErrorForLogging(error);

  let message: string;
  if (error instanceof NotionApiError) {
    message = `Error: ${error.message}`;
    if (error.retryable) {
      message += ' (retryable)';
    }
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = `Error: ${String(error)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, details: errorInfo }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data: unknown, entityType: string): string {
  if (isPaginatedResponse(data)) {
    return formatPaginatedAsMarkdown(data, entityType);
  }

  if (Array.isArray(data)) {
    return formatArrayAsMarkdown(data, entityType);
  }

  if (typeof data === 'object' && data !== null) {
    return formatObjectAsMarkdown(data as Record<string, unknown>, entityType);
  }

  return String(data);
}

/**
 * Type guard for paginated response
 */
function isPaginatedResponse(data: unknown): data is PaginatedResponse<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    Array.isArray((data as PaginatedResponse<unknown>).results) &&
    'object' in data &&
    (data as PaginatedResponse<unknown>).object === 'list'
  );
}

/**
 * Format paginated response as Markdown
 */
function formatPaginatedAsMarkdown(data: PaginatedResponse<unknown>, entityType: string): string {
  const lines: string[] = [];

  lines.push(`## ${capitalize(entityType)}`);
  lines.push('');

  lines.push(`**Count:** ${data.results.length}`);

  if (data.hasMore) {
    lines.push(`**More available:** Yes (cursor: \`${data.nextCursor}\`)`);
  }
  lines.push('');

  if (data.results.length === 0) {
    lines.push('_No items found._');
    return lines.join('\n');
  }

  // Format items based on entity type
  switch (entityType) {
    case 'users':
      lines.push(formatUsersTable(data.results as User[]));
      break;
    case 'pages':
      lines.push(formatPagesTable(data.results as Page[]));
      break;
    case 'databases':
      lines.push(formatDatabasesTable(data.results as Database[]));
      break;
    case 'blocks':
      lines.push(formatBlocksTable(data.results as Block[]));
      break;
    case 'comments':
      lines.push(formatCommentsTable(data.results as Comment[]));
      break;
    default:
      lines.push(formatGenericTable(data.results));
  }

  return lines.join('\n');
}

/**
 * Format users as Markdown table
 */
function formatUsersTable(users: User[]): string {
  const lines: string[] = [];
  lines.push('| ID | Name | Type | Email |');
  lines.push('|---|---|---|---|');

  for (const user of users) {
    const email = user.person?.email || '-';
    lines.push(`| ${user.id} | ${user.name || '-'} | ${user.type || '-'} | ${email} |`);
  }

  return lines.join('\n');
}

/**
 * Format pages as Markdown table
 */
function formatPagesTable(pages: Page[]): string {
  const lines: string[] = [];
  lines.push('| ID | Title | Created | Last Edited |');
  lines.push('|---|---|---|---|');

  for (const page of pages) {
    const title = getPageTitle(page);
    lines.push(
      `| ${page.id} | ${title} | ${page.created_time.split('T')[0]} | ${page.last_edited_time.split('T')[0]} |`
    );
  }

  return lines.join('\n');
}

/**
 * Format databases as Markdown table
 */
function formatDatabasesTable(databases: Database[]): string {
  const lines: string[] = [];
  lines.push('| ID | Title | Created | Properties |');
  lines.push('|---|---|---|---|');

  for (const db of databases) {
    const title = richTextToPlain(db.title);
    const propCount = Object.keys(db.properties).length;
    lines.push(`| ${db.id} | ${title || '-'} | ${db.created_time.split('T')[0]} | ${propCount} |`);
  }

  return lines.join('\n');
}

/**
 * Format blocks as Markdown table
 */
function formatBlocksTable(blocks: Block[]): string {
  const lines: string[] = [];
  lines.push('| ID | Type | Has Children |');
  lines.push('|---|---|---|');

  for (const block of blocks) {
    lines.push(`| ${block.id} | ${block.type} | ${block.has_children ? 'Yes' : 'No'} |`);
  }

  return lines.join('\n');
}

/**
 * Format comments as Markdown table
 */
function formatCommentsTable(comments: Comment[]): string {
  const lines: string[] = [];
  lines.push('| ID | Text | Created |');
  lines.push('|---|---|---|');

  for (const comment of comments) {
    const text = richTextToPlain(comment.rich_text).slice(0, 50);
    lines.push(`| ${comment.id} | ${text}... | ${comment.created_time.split('T')[0]} |`);
  }

  return lines.join('\n');
}

/**
 * Format a generic array as Markdown table
 */
function formatGenericTable(items: unknown[]): string {
  if (items.length === 0) return '_No items_';

  const first = items[0] as Record<string, unknown>;
  const keys = Object.keys(first).slice(0, 5); // Limit columns

  const lines: string[] = [];
  lines.push(`| ${keys.join(' | ')} |`);
  lines.push(`|${keys.map(() => '---').join('|')}|`);

  for (const item of items) {
    const record = item as Record<string, unknown>;
    const values = keys.map((k) => String(record[k] ?? '-').slice(0, 30));
    lines.push(`| ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format an array as Markdown
 */
function formatArrayAsMarkdown(data: unknown[], entityType: string): string {
  return formatGenericTable(data);
}

/**
 * Format a single object as Markdown
 */
function formatObjectAsMarkdown(data: Record<string, unknown>, entityType: string): string {
  const lines: string[] = [];
  lines.push(`## ${capitalize(entityType.replace(/s$/, ''))}`);
  lines.push('');

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object') {
      lines.push(`**${formatKey(key)}:**`);
      lines.push('```json');
      lines.push(JSON.stringify(value, null, 2));
      lines.push('```');
    } else {
      lines.push(`**${formatKey(key)}:** ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a key for display (camelCase/snake_case to Title Case)
 */
function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Extract plain text from rich text array
 */
export function richTextToPlain(richText: RichTextItem[]): string {
  return richText.map((item) => item.plain_text || item.text?.content || '').join('');
}

/**
 * Get page title from properties
 */
export function getPageTitle(page: Page): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title' && 'title' in prop) {
      return richTextToPlain(prop.title);
    }
  }
  return 'Untitled';
}
