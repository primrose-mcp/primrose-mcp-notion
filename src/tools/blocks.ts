/**
 * Block Tools
 *
 * MCP tools for Notion block management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NotionClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all block-related tools
 */
export function registerBlockTools(server: McpServer, client: NotionClient): void {
  // ===========================================================================
  // Get Block
  // ===========================================================================
  server.tool(
    'notion_get_block',
    `Retrieve a Notion block by its ID.

A block is any piece of content in Notion - paragraphs, headings, lists, etc.
Pages and databases are also blocks.

Args:
  - blockId: The block ID
  - format: Response format ('json' or 'markdown')

Returns:
  The block object with its type-specific content.`,
    {
      blockId: z.string().describe('The block ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ blockId, format }) => {
      try {
        const block = await client.getBlock(blockId);
        return formatResponse(block, format, 'block');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Block Children
  // ===========================================================================
  server.tool(
    'notion_get_block_children',
    `Get the children blocks of a block or page.

Use this to read the content of a page or the nested content of a block.

Args:
  - blockId: The block ID (or page ID) to get children from
  - startCursor: Pagination cursor from previous response
  - pageSize: Number of blocks to return (1-100, default: 100)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of child blocks.`,
    {
      blockId: z.string().describe('The block or page ID'),
      startCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().int().min(1).max(100).default(100).describe('Number of blocks'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ blockId, startCursor, pageSize, format }) => {
      try {
        const result = await client.getBlockChildren(blockId, startCursor, pageSize);
        return formatResponse(result, format, 'blocks');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Append Block Children
  // ===========================================================================
  server.tool(
    'notion_append_blocks',
    `Append new blocks as children of an existing block or page.

Use this to add content to a page or nest content inside a block.

Args:
  - blockId: The block or page ID to append children to
  - children: Array of block objects to append. Common block types:
    - Paragraph: { "type": "paragraph", "paragraph": { "rich_text": [{ "type": "text", "text": { "content": "Hello" } }] } }
    - Heading 1: { "type": "heading_1", "heading_1": { "rich_text": [{ "type": "text", "text": { "content": "Title" } }] } }
    - Heading 2: { "type": "heading_2", "heading_2": { "rich_text": [...] } }
    - Heading 3: { "type": "heading_3", "heading_3": { "rich_text": [...] } }
    - Bulleted list: { "type": "bulleted_list_item", "bulleted_list_item": { "rich_text": [...] } }
    - Numbered list: { "type": "numbered_list_item", "numbered_list_item": { "rich_text": [...] } }
    - To-do: { "type": "to_do", "to_do": { "rich_text": [...], "checked": false } }
    - Toggle: { "type": "toggle", "toggle": { "rich_text": [...] } }
    - Quote: { "type": "quote", "quote": { "rich_text": [...] } }
    - Callout: { "type": "callout", "callout": { "rich_text": [...], "icon": { "emoji": "..." } } }
    - Code: { "type": "code", "code": { "rich_text": [...], "language": "javascript" } }
    - Divider: { "type": "divider", "divider": {} }
    - Image: { "type": "image", "image": { "type": "external", "external": { "url": "..." } } }
    - Bookmark: { "type": "bookmark", "bookmark": { "url": "..." } }

Returns:
  The appended blocks.`,
    {
      blockId: z.string().describe('The block or page ID'),
      children: z.array(z.record(z.string(), z.unknown())).describe('Array of block objects to append'),
    },
    async ({ blockId, children }) => {
      try {
        const result = await client.appendBlockChildren(blockId, children);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: true, message: `Appended ${result.results.length} blocks`, blocks: result },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Update Block
  // ===========================================================================
  server.tool(
    'notion_update_block',
    `Update an existing block's content.

Args:
  - blockId: The block ID to update
  - content: The block content to update. Must include the block type.
             Example for paragraph: { "paragraph": { "rich_text": [{ "type": "text", "text": { "content": "New text" } }] } }
             To archive a block: { "archived": true }

Returns:
  The updated block object.`,
    {
      blockId: z.string().describe('The block ID'),
      content: z.record(z.string(), z.unknown()).describe('Block content to update'),
    },
    async ({ blockId, content }) => {
      try {
        const block = await client.updateBlock(blockId, content);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, message: 'Block updated', block }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Delete Block
  // ===========================================================================
  server.tool(
    'notion_delete_block',
    `Delete (trash) a block.

The block and all its children will be moved to trash.

Args:
  - blockId: The block ID to delete

Returns:
  The deleted block object (with archived: true).`,
    {
      blockId: z.string().describe('The block ID to delete'),
    },
    async ({ blockId }) => {
      try {
        const block = await client.deleteBlock(blockId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, message: 'Block deleted', block }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
