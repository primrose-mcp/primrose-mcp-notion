/**
 * User Tools
 *
 * MCP tools for Notion user management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NotionClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all user-related tools
 */
export function registerUserTools(server: McpServer, client: NotionClient): void {
  // ===========================================================================
  // List Users
  // ===========================================================================
  server.tool(
    'notion_list_users',
    `List all users in the Notion workspace.

Returns a paginated list of all users (people and bots) that have access to the workspace.

Args:
  - startCursor: Pagination cursor from previous response
  - pageSize: Number of users to return (1-100, default: 100)
  - format: Response format ('json' or 'markdown')

Returns:
  List of users with their IDs, names, types, and email addresses.`,
    {
      startCursor: z.string().optional().describe('Pagination cursor from previous response'),
      pageSize: z.number().int().min(1).max(100).default(100).describe('Number of users to return'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ startCursor, pageSize, format }) => {
      try {
        const result = await client.listUsers(startCursor, pageSize);
        return formatResponse(result, format, 'users');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get User
  // ===========================================================================
  server.tool(
    'notion_get_user',
    `Get a single user by their ID.

Args:
  - userId: The user's Notion ID
  - format: Response format ('json' or 'markdown')

Returns:
  The user object with all available details.`,
    {
      userId: z.string().describe('The user ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ userId, format }) => {
      try {
        const user = await client.getUser(userId);
        return formatResponse(user, format, 'user');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Me (Current Bot User)
  // ===========================================================================
  server.tool(
    'notion_get_me',
    `Get the current bot user (the integration making the API call).

This is useful to verify the connection and see which bot/integration is being used.

Args:
  - format: Response format ('json' or 'markdown')

Returns:
  The bot user object for the current integration.`,
    {
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ format }) => {
      try {
        const user = await client.getMe();
        return formatResponse(user, format, 'user');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
