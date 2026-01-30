# Notion MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with Notion workspaces. Create pages, query databases, manage blocks, and more.

[![Primrose MCP](https://img.shields.io/badge/Primrose-MCP-6366f1)](https://primrose.dev/mcp/notion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[View on Primrose](https://primrose.dev/mcp/notion)** | **[Documentation](https://primrose.dev/docs)**

---

## Features

- **Pages** - Create, update, and archive Notion pages
- **Databases** - Query, create, and manage databases
- **Blocks** - Add, update, and delete content blocks
- **Search** - Search across your entire workspace
- **Users** - List workspace members and bot info
- **Comments** - Add and retrieve comments on pages

## Quick Start

### Using Primrose SDK (Recommended)

The fastest way to get started is with the [Primrose SDK](https://github.com/primrose-mcp/primrose-sdk), which handles authentication and provides tool definitions formatted for your LLM provider.

```bash
npm install primrose-mcp
```

```typescript
import { Primrose } from 'primrose-mcp';

const primrose = new Primrose({
  apiKey: 'prm_xxxxx',
  provider: 'anthropic', // or 'openai', 'google', 'amazon', etc.
});

// List available Notion tools
const tools = await primrose.listTools({ mcpServer: 'notion' });

// Call a tool
const result = await primrose.callTool('notion_create_page', {
  parent_id: 'database-id',
  properties: {
    Name: { title: [{ text: { content: 'New Page' } }] },
  },
});
```

[Get your Primrose API key](https://primrose.dev) to start building.

### Manual Installation

If you prefer to self-host, you can deploy this MCP server directly to Cloudflare Workers.

```bash
# Clone the repository
git clone https://github.com/primrose-mcp/primrose-mcp-notion.git
cd primrose-mcp-notion

# Install dependencies
bun install

# Deploy to Cloudflare Workers
bun run deploy
```

## Configuration

This server uses a multi-tenant architecture where credentials are passed via request headers.

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Notion-Integration-Token` | Notion integration token (`secret_...`) |

### Getting Your Integration Token

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Give it a name and select your workspace
4. Copy the **Internal Integration Token**
5. Share the pages/databases you want to access with your integration

> **Important:** Your integration can only access pages that have been explicitly shared with it. Go to each page → Share → Invite your integration.

## Available Tools

### Pages
- `notion_create_page` - Create a new page
- `notion_get_page` - Retrieve page details
- `notion_update_page` - Update page properties
- `notion_archive_page` - Archive (delete) a page
- `notion_get_page_property` - Get a specific property value

### Databases
- `notion_create_database` - Create a new database
- `notion_get_database` - Retrieve database schema
- `notion_update_database` - Update database properties
- `notion_query_database` - Query database with filters and sorts

### Blocks
- `notion_get_block` - Get a specific block
- `notion_get_block_children` - Get child blocks of a page/block
- `notion_append_block_children` - Add new blocks to a page
- `notion_update_block` - Update block content
- `notion_delete_block` - Delete a block

### Search
- `notion_search` - Search pages and databases by title
- `notion_search_by_title` - Search with title filter

### Users
- `notion_list_users` - List all workspace members
- `notion_get_user` - Get user details
- `notion_get_bot_user` - Get the bot's own user info

### Comments
- `notion_create_comment` - Add a comment to a page
- `notion_get_comments` - Retrieve comments on a page

## Development

```bash
# Run locally
bun run dev

# Type check
bun run typecheck

# Lint
bun run lint

# Test with MCP Inspector
bun run inspector
```

## Related Resources

- [Primrose SDK](https://github.com/primrose-mcp/primrose-sdk)
- [Notion API Documentation](https://developers.notion.com)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT License - see [LICENSE](LICENSE) for details.
