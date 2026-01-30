/**
 * Database Tools
 *
 * MCP tools for Notion database management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NotionClient } from '../client.js';
import type { DatabaseFilter, DatabaseSort } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all database-related tools
 */
export function registerDatabaseTools(server: McpServer, client: NotionClient): void {
  // ===========================================================================
  // Get Database
  // ===========================================================================
  server.tool(
    'notion_get_database',
    `Retrieve a Notion database by its ID.

Returns the database object with its schema (properties), title, and metadata.

Args:
  - databaseId: The database ID
  - format: Response format ('json' or 'markdown')

Returns:
  The database object with all properties and their configurations.`,
    {
      databaseId: z.string().describe('The database ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ databaseId, format }) => {
      try {
        const database = await client.getDatabase(databaseId);
        return formatResponse(database, format, 'database');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Query Database
  // ===========================================================================
  server.tool(
    'notion_query_database',
    `Query a Notion database to retrieve pages that match filter criteria.

Args:
  - databaseId: The database ID to query
  - filter: Optional filter object using Notion's filter syntax. Example:
            { "property": "Status", "status": { "equals": "Done" } }
            Compound filters use "and" or "or" arrays.
  - sorts: Optional array of sort objects. Example:
           [{ "property": "Created", "direction": "descending" }]
           Or use timestamp: [{ "timestamp": "last_edited_time", "direction": "descending" }]
  - startCursor: Pagination cursor from previous response
  - pageSize: Number of results to return (1-100, default: 100)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of pages that match the query.`,
    {
      databaseId: z.string().describe('The database ID'),
      filter: z.record(z.string(), z.unknown()).optional().describe('Filter object'),
      sorts: z.array(z.record(z.string(), z.unknown())).optional().describe('Array of sort objects'),
      startCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().int().min(1).max(100).default(100).describe('Number of results'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ databaseId, filter, sorts, startCursor, pageSize, format }) => {
      try {
        const result = await client.queryDatabase(
          databaseId,
          filter as DatabaseFilter | undefined,
          sorts as DatabaseSort[] | undefined,
          startCursor,
          pageSize
        );
        return formatResponse(result, format, 'pages');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Database
  // ===========================================================================
  server.tool(
    'notion_create_database',
    `Create a new Notion database as a child of a page.

Args:
  - parentPageId: The ID of the parent page where the database will be created
  - title: Database title as rich text array. Simple example:
           [{ "type": "text", "text": { "content": "My Database" } }]
  - properties: Database schema defining the columns. Each property has a name and type config.
                Example: {
                  "Name": { "title": {} },
                  "Status": { "select": { "options": [{ "name": "Todo" }, { "name": "Done" }] } },
                  "Date": { "date": {} }
                }
  - icon: Optional icon object
  - cover: Optional cover image object

Returns:
  The created database object.`,
    {
      parentPageId: z.string().describe('Parent page ID'),
      title: z.array(z.record(z.string(), z.unknown())).describe('Title as rich text array'),
      properties: z.record(z.string(), z.unknown()).describe('Database schema/properties'),
      icon: z.unknown().optional().describe('Icon object'),
      cover: z.unknown().optional().describe('Cover image object'),
    },
    async ({ parentPageId, title, properties, icon, cover }) => {
      try {
        const database = await client.createDatabase(
          parentPageId,
          title as any,
          properties,
          icon,
          cover
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: true, message: 'Database created', database },
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
  // Update Database
  // ===========================================================================
  server.tool(
    'notion_update_database',
    `Update a Notion database's title, description, or properties.

Args:
  - databaseId: The database ID to update
  - title: New title as rich text array
  - description: New description as rich text array
  - properties: Properties to add, update, or remove. To remove a property, set it to null.
                Example: { "New Column": { "checkbox": {} }, "Old Column": null }
  - icon: New icon object, or null to remove
  - cover: New cover object, or null to remove

Returns:
  The updated database object.`,
    {
      databaseId: z.string().describe('The database ID'),
      title: z.array(z.record(z.string(), z.unknown())).optional().describe('New title as rich text'),
      description: z.array(z.record(z.string(), z.unknown())).optional().describe('New description'),
      properties: z.record(z.string(), z.unknown()).optional().describe('Properties to update'),
      icon: z.unknown().optional().describe('New icon'),
      cover: z.unknown().optional().describe('New cover'),
    },
    async ({ databaseId, title, description, properties, icon, cover }) => {
      try {
        const database = await client.updateDatabase(
          databaseId,
          title as any,
          description as any,
          properties,
          icon,
          cover
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: true, message: 'Database updated', database },
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
}
