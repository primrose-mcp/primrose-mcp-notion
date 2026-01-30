/**
 * Page Tools
 *
 * MCP tools for Notion page management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NotionClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all page-related tools
 */
export function registerPageTools(server: McpServer, client: NotionClient): void {
  // ===========================================================================
  // Get Page
  // ===========================================================================
  server.tool(
    'notion_get_page',
    `Retrieve a Notion page by its ID.

Args:
  - pageId: The page ID (can be with or without hyphens)
  - format: Response format ('json' or 'markdown')

Returns:
  The page object with all properties, metadata, and parent information.`,
    {
      pageId: z.string().describe('The page ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ pageId, format }) => {
      try {
        const page = await client.getPage(pageId);
        return formatResponse(page, format, 'page');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Page
  // ===========================================================================
  server.tool(
    'notion_create_page',
    `Create a new Notion page.

The page can be created as a child of a database (with database_id) or as a child of another page (with page_id).

Args:
  - parentId: The ID of the parent (database or page)
  - parentType: Type of parent - 'database_id' for database pages, 'page_id' for child pages
  - properties: Page properties object. For database pages, must include properties matching the database schema.
                For child pages, typically just { "title": { "title": [{ "text": { "content": "Page Title" } }] } }
  - children: Optional array of block objects to add as page content
  - icon: Optional icon object { "type": "emoji", "emoji": "..." } or { "type": "external", "external": { "url": "..." } }
  - cover: Optional cover object { "type": "external", "external": { "url": "..." } }

Returns:
  The created page object.`,
    {
      parentId: z.string().describe('Parent database or page ID'),
      parentType: z
        .enum(['database_id', 'page_id'])
        .describe('Type of parent: database_id or page_id'),
      properties: z.record(z.string(), z.unknown()).describe('Page properties object'),
      children: z.array(z.unknown()).optional().describe('Array of block objects for page content'),
      icon: z.unknown().optional().describe('Icon object'),
      cover: z.unknown().optional().describe('Cover image object'),
    },
    async ({ parentId, parentType, properties, children, icon, cover }) => {
      try {
        const page = await client.createPage(
          parentId,
          parentType,
          properties,
          children,
          icon,
          cover
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, message: 'Page created', page }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Update Page
  // ===========================================================================
  server.tool(
    'notion_update_page',
    `Update an existing Notion page's properties.

Args:
  - pageId: The page ID to update
  - properties: Properties to update (only include properties you want to change)
  - archived: Set to true to archive the page, false to unarchive
  - icon: New icon object, or null to remove
  - cover: New cover object, or null to remove

Returns:
  The updated page object.`,
    {
      pageId: z.string().describe('The page ID to update'),
      properties: z.record(z.string(), z.unknown()).optional().describe('Properties to update'),
      archived: z.boolean().optional().describe('Archive or unarchive the page'),
      icon: z.unknown().optional().describe('New icon object'),
      cover: z.unknown().optional().describe('New cover object'),
    },
    async ({ pageId, properties, archived, icon, cover }) => {
      try {
        const page = await client.updatePage(pageId, properties, archived, icon, cover);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, message: 'Page updated', page }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Trash Page
  // ===========================================================================
  server.tool(
    'notion_trash_page',
    `Move a Notion page to trash.

This is equivalent to deleting the page. The page can be restored from trash within Notion.

Args:
  - pageId: The page ID to trash

Returns:
  The trashed page object.`,
    {
      pageId: z.string().describe('The page ID to trash'),
    },
    async ({ pageId }) => {
      try {
        const page = await client.trashPage(pageId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, message: 'Page moved to trash', page }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Page Property
  // ===========================================================================
  server.tool(
    'notion_get_page_property',
    `Retrieve a specific property value from a page.

This is useful for paginated properties like title, rich_text, relation, and people,
where the full value may not be returned in the page object.

Args:
  - pageId: The page ID
  - propertyId: The property ID (from the page's properties object)
  - startCursor: Pagination cursor for paginated properties
  - pageSize: Number of items to return (for paginated properties)

Returns:
  The property value or paginated list of property items.`,
    {
      pageId: z.string().describe('The page ID'),
      propertyId: z.string().describe('The property ID'),
      startCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().int().min(1).max(100).optional().describe('Page size'),
    },
    async ({ pageId, propertyId, startCursor, pageSize }) => {
      try {
        const result = await client.getPageProperty(pageId, propertyId, startCursor, pageSize);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
