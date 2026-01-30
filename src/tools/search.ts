/**
 * Search Tools
 *
 * MCP tools for Notion search functionality.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NotionClient } from '../client.js';
import type { SearchFilter, SearchSort } from '../types/entities.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register search-related tools
 */
export function registerSearchTools(server: McpServer, client: NotionClient): void {
  // ===========================================================================
  // Search
  // ===========================================================================
  server.tool(
    'notion_search',
    `Search for pages and databases in Notion by title.

Searches across all pages and databases that have been shared with the integration.

Args:
  - query: Optional search query string. Searches by title match.
           If empty, returns all accessible pages/databases.
  - filter: Optional filter to search only pages or only databases.
            Example: { "value": "page", "property": "object" }
            Or: { "value": "database", "property": "object" }
  - sort: Optional sort configuration.
          Example: { "direction": "ascending", "timestamp": "last_edited_time" }
          Or: { "direction": "descending", "timestamp": "last_edited_time" }
  - startCursor: Pagination cursor from previous response
  - pageSize: Number of results to return (1-100, default: 100)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of matching pages and/or databases.`,
    {
      query: z.string().optional().describe('Search query string'),
      filter: z.record(z.string(), z.unknown()).optional().describe('Filter for pages or databases only'),
      sort: z.record(z.string(), z.unknown()).optional().describe('Sort configuration'),
      startCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().int().min(1).max(100).default(100).describe('Number of results'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ query, filter, sort, startCursor, pageSize, format }) => {
      try {
        const result = await client.search(
          query,
          filter as SearchFilter | undefined,
          sort as SearchSort | undefined,
          startCursor,
          pageSize
        );
        return formatResponse(result, format, 'search results');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
