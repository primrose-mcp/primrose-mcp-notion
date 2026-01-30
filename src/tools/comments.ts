/**
 * Comment Tools
 *
 * MCP tools for Notion comment management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NotionClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all comment-related tools
 */
export function registerCommentTools(server: McpServer, client: NotionClient): void {
  // ===========================================================================
  // Get Comments
  // ===========================================================================
  server.tool(
    'notion_get_comments',
    `Retrieve comments from a page or block.

Gets all comments associated with a page or specific block.

Args:
  - blockId: The page ID or block ID to get comments from
  - startCursor: Pagination cursor from previous response
  - pageSize: Number of comments to return (1-100, default: 100)
  - format: Response format ('json' or 'markdown')

Returns:
  Paginated list of comments with their text, author, and timestamps.`,
    {
      blockId: z.string().describe('The page or block ID'),
      startCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().int().min(1).max(100).default(100).describe('Number of comments'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ blockId, startCursor, pageSize, format }) => {
      try {
        const result = await client.getComments(blockId, startCursor, pageSize);
        return formatResponse(result, format, 'comments');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Comment
  // ===========================================================================
  server.tool(
    'notion_create_comment',
    `Create a new comment on a page or in a discussion.

Args:
  - parentId: Either a page_id to start a new comment thread, or a discussion_id to reply in an existing thread
  - parentType: Type of parent - 'page_id' for new threads, 'discussion_id' for replies
  - richText: Comment text as rich text array.
              Example: [{ "type": "text", "text": { "content": "This is a comment" } }]
              Can include mentions: [{ "type": "mention", "mention": { "type": "user", "user": { "id": "user-id" } } }]

Returns:
  The created comment object.`,
    {
      parentId: z.string().describe('Page ID or discussion ID'),
      parentType: z.enum(['page_id', 'discussion_id']).describe('Type of parent'),
      richText: z.array(z.record(z.string(), z.unknown())).describe('Comment text as rich text array'),
    },
    async ({ parentId, parentType, richText }) => {
      try {
        const comment = await client.createComment(parentId, parentType, richText as any);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, message: 'Comment created', comment }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Comment
  // ===========================================================================
  server.tool(
    'notion_get_comment',
    `Retrieve a specific comment by its ID.

Args:
  - commentId: The comment ID
  - format: Response format ('json' or 'markdown')

Returns:
  The comment object with its text, author, and timestamps.`,
    {
      commentId: z.string().describe('The comment ID'),
      format: z.enum(['json', 'markdown']).default('json'),
    },
    async ({ commentId, format }) => {
      try {
        const comment = await client.getComment(commentId);
        return formatResponse(comment, format, 'comment');
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
