/**
 * Notion API Client
 *
 * Handles all HTTP communication with the Notion API.
 *
 * MULTI-TENANT: This client receives credentials per-request via TenantCredentials,
 * allowing a single server to serve multiple tenants with different integration tokens.
 */

import type {
  Block,
  Comment,
  Database,
  DatabaseFilter,
  DatabaseSort,
  Page,
  PaginatedResponse,
  RichTextItem,
  SearchFilter,
  SearchSort,
  User,
} from './types/entities.js';
import type { TenantCredentials } from './types/env.js';
import { AuthenticationError, NotFoundError, NotionApiError, RateLimitError } from './utils/errors.js';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// =============================================================================
// Notion Client Interface
// =============================================================================

export interface NotionClient {
  // Connection
  testConnection(): Promise<{ connected: boolean; message: string }>;

  // Users
  listUsers(startCursor?: string, pageSize?: number): Promise<PaginatedResponse<User>>;
  getUser(userId: string): Promise<User>;
  getMe(): Promise<User>;

  // Pages
  getPage(pageId: string): Promise<Page>;
  createPage(
    parentId: string,
    parentType: 'database_id' | 'page_id',
    properties: Record<string, unknown>,
    children?: unknown[],
    icon?: unknown,
    cover?: unknown
  ): Promise<Page>;
  updatePage(
    pageId: string,
    properties?: Record<string, unknown>,
    archived?: boolean,
    icon?: unknown,
    cover?: unknown
  ): Promise<Page>;
  trashPage(pageId: string): Promise<Page>;
  getPageProperty(
    pageId: string,
    propertyId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<unknown>;

  // Databases
  getDatabase(databaseId: string): Promise<Database>;
  queryDatabase(
    databaseId: string,
    filter?: DatabaseFilter,
    sorts?: DatabaseSort[],
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Page>>;
  createDatabase(
    parentPageId: string,
    title: RichTextItem[],
    properties: Record<string, unknown>,
    icon?: unknown,
    cover?: unknown
  ): Promise<Database>;
  updateDatabase(
    databaseId: string,
    title?: RichTextItem[],
    description?: RichTextItem[],
    properties?: Record<string, unknown>,
    icon?: unknown,
    cover?: unknown
  ): Promise<Database>;

  // Blocks
  getBlock(blockId: string): Promise<Block>;
  updateBlock(blockId: string, content: Record<string, unknown>): Promise<Block>;
  deleteBlock(blockId: string): Promise<Block>;
  getBlockChildren(
    blockId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Block>>;
  appendBlockChildren(blockId: string, children: unknown[]): Promise<PaginatedResponse<Block>>;

  // Search
  search(
    query?: string,
    filter?: SearchFilter,
    sort?: SearchSort,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Page | Database>>;

  // Comments
  getComments(
    blockOrPageId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Comment>>;
  createComment(
    parentId: string,
    parentType: 'page_id' | 'discussion_id',
    richText: RichTextItem[]
  ): Promise<Comment>;
  getComment(commentId: string): Promise<Comment>;
}

// =============================================================================
// Notion Client Implementation
// =============================================================================

class NotionClientImpl implements NotionClient {
  private credentials: TenantCredentials;

  constructor(credentials: TenantCredentials) {
    this.credentials = credentials;
  }

  // ===========================================================================
  // HTTP Request Helper
  // ===========================================================================

  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials.integrationToken) {
      throw new AuthenticationError(
        'No credentials provided. Include X-Notion-Integration-Token header.'
      );
    }

    return {
      Authorization: `Bearer ${this.credentials.integrationToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError('Rate limit exceeded', retryAfter ? parseInt(retryAfter, 10) : 60);
    }

    // Handle authentication errors
    if (response.status === 401) {
      throw new AuthenticationError('Authentication failed. Check your Notion integration token.');
    }

    // Handle forbidden
    if (response.status === 403) {
      throw new NotionApiError(
        'Access forbidden. Ensure your integration has the required permissions.',
        403,
        'FORBIDDEN'
      );
    }

    // Handle not found
    if (response.status === 404) {
      throw new NotFoundError('Resource', endpoint);
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        message = errorJson.message || errorJson.error || message;
      } catch {
        // Use default message
      }
      throw new NotionApiError(message, response.status);
    }

    return response.json() as Promise<T>;
  }

  // ===========================================================================
  // Connection
  // ===========================================================================

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const user = await this.getMe();
      return {
        connected: true,
        message: `Successfully connected to Notion as ${user.name || user.id}`,
      };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ===========================================================================
  // Users
  // ===========================================================================

  async listUsers(startCursor?: string, pageSize?: number): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    if (startCursor) params.set('start_cursor', startCursor);
    if (pageSize) params.set('page_size', String(pageSize));

    const queryString = params.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<{
      object: 'list';
      results: User[];
      has_more: boolean;
      next_cursor: string | null;
      type: string;
    }>(endpoint);

    return {
      object: 'list',
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
      type: response.type,
    };
  }

  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  async getMe(): Promise<User> {
    return this.request<User>('/users/me');
  }

  // ===========================================================================
  // Pages
  // ===========================================================================

  async getPage(pageId: string): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}`);
  }

  async createPage(
    parentId: string,
    parentType: 'database_id' | 'page_id',
    properties: Record<string, unknown>,
    children?: unknown[],
    icon?: unknown,
    cover?: unknown
  ): Promise<Page> {
    const body: Record<string, unknown> = {
      parent: { [parentType]: parentId },
      properties,
    };

    if (children && children.length > 0) {
      body.children = children;
    }
    if (icon) {
      body.icon = icon;
    }
    if (cover) {
      body.cover = cover;
    }

    return this.request<Page>('/pages', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updatePage(
    pageId: string,
    properties?: Record<string, unknown>,
    archived?: boolean,
    icon?: unknown,
    cover?: unknown
  ): Promise<Page> {
    const body: Record<string, unknown> = {};

    if (properties) {
      body.properties = properties;
    }
    if (archived !== undefined) {
      body.archived = archived;
    }
    if (icon !== undefined) {
      body.icon = icon;
    }
    if (cover !== undefined) {
      body.cover = cover;
    }

    return this.request<Page>(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async trashPage(pageId: string): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}`, {
      method: 'DELETE',
    });
  }

  async getPageProperty(
    pageId: string,
    propertyId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (startCursor) params.set('start_cursor', startCursor);
    if (pageSize) params.set('page_size', String(pageSize));

    const queryString = params.toString();
    const endpoint = `/pages/${pageId}/properties/${propertyId}${queryString ? `?${queryString}` : ''}`;

    return this.request<unknown>(endpoint);
  }

  // ===========================================================================
  // Databases
  // ===========================================================================

  async getDatabase(databaseId: string): Promise<Database> {
    return this.request<Database>(`/databases/${databaseId}`);
  }

  async queryDatabase(
    databaseId: string,
    filter?: DatabaseFilter,
    sorts?: DatabaseSort[],
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Page>> {
    const body: Record<string, unknown> = {};

    if (filter) {
      body.filter = filter;
    }
    if (sorts && sorts.length > 0) {
      body.sorts = sorts;
    }
    if (startCursor) {
      body.start_cursor = startCursor;
    }
    if (pageSize) {
      body.page_size = pageSize;
    }

    const response = await this.request<{
      object: 'list';
      results: Page[];
      has_more: boolean;
      next_cursor: string | null;
      type: string;
    }>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      object: 'list',
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
      type: response.type,
    };
  }

  async createDatabase(
    parentPageId: string,
    title: RichTextItem[],
    properties: Record<string, unknown>,
    icon?: unknown,
    cover?: unknown
  ): Promise<Database> {
    const body: Record<string, unknown> = {
      parent: { type: 'page_id', page_id: parentPageId },
      title,
      properties,
    };

    if (icon) {
      body.icon = icon;
    }
    if (cover) {
      body.cover = cover;
    }

    return this.request<Database>('/databases', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateDatabase(
    databaseId: string,
    title?: RichTextItem[],
    description?: RichTextItem[],
    properties?: Record<string, unknown>,
    icon?: unknown,
    cover?: unknown
  ): Promise<Database> {
    const body: Record<string, unknown> = {};

    if (title) {
      body.title = title;
    }
    if (description) {
      body.description = description;
    }
    if (properties) {
      body.properties = properties;
    }
    if (icon !== undefined) {
      body.icon = icon;
    }
    if (cover !== undefined) {
      body.cover = cover;
    }

    return this.request<Database>(`/databases/${databaseId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // ===========================================================================
  // Blocks
  // ===========================================================================

  async getBlock(blockId: string): Promise<Block> {
    return this.request<Block>(`/blocks/${blockId}`);
  }

  async updateBlock(blockId: string, content: Record<string, unknown>): Promise<Block> {
    return this.request<Block>(`/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(content),
    });
  }

  async deleteBlock(blockId: string): Promise<Block> {
    return this.request<Block>(`/blocks/${blockId}`, {
      method: 'DELETE',
    });
  }

  async getBlockChildren(
    blockId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Block>> {
    const params = new URLSearchParams();
    if (startCursor) params.set('start_cursor', startCursor);
    if (pageSize) params.set('page_size', String(pageSize));

    const queryString = params.toString();
    const endpoint = `/blocks/${blockId}/children${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<{
      object: 'list';
      results: Block[];
      has_more: boolean;
      next_cursor: string | null;
      type: string;
    }>(endpoint);

    return {
      object: 'list',
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
      type: response.type,
    };
  }

  async appendBlockChildren(
    blockId: string,
    children: unknown[]
  ): Promise<PaginatedResponse<Block>> {
    const response = await this.request<{
      object: 'list';
      results: Block[];
      has_more: boolean;
      next_cursor: string | null;
      type: string;
    }>(`/blocks/${blockId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children }),
    });

    return {
      object: 'list',
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
      type: response.type,
    };
  }

  // ===========================================================================
  // Search
  // ===========================================================================

  async search(
    query?: string,
    filter?: SearchFilter,
    sort?: SearchSort,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Page | Database>> {
    const body: Record<string, unknown> = {};

    if (query) {
      body.query = query;
    }
    if (filter) {
      body.filter = filter;
    }
    if (sort) {
      body.sort = sort;
    }
    if (startCursor) {
      body.start_cursor = startCursor;
    }
    if (pageSize) {
      body.page_size = pageSize;
    }

    const response = await this.request<{
      object: 'list';
      results: (Page | Database)[];
      has_more: boolean;
      next_cursor: string | null;
      type: string;
    }>('/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      object: 'list',
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
      type: response.type,
    };
  }

  // ===========================================================================
  // Comments
  // ===========================================================================

  async getComments(
    blockOrPageId: string,
    startCursor?: string,
    pageSize?: number
  ): Promise<PaginatedResponse<Comment>> {
    const params = new URLSearchParams();
    params.set('block_id', blockOrPageId);
    if (startCursor) params.set('start_cursor', startCursor);
    if (pageSize) params.set('page_size', String(pageSize));

    const response = await this.request<{
      object: 'list';
      results: Comment[];
      has_more: boolean;
      next_cursor: string | null;
      type: string;
    }>(`/comments?${params.toString()}`);

    return {
      object: 'list',
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor || undefined,
      type: response.type,
    };
  }

  async createComment(
    parentId: string,
    parentType: 'page_id' | 'discussion_id',
    richText: RichTextItem[]
  ): Promise<Comment> {
    const body: Record<string, unknown> = {
      [parentType]: parentId,
      rich_text: richText,
    };

    return this.request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getComment(commentId: string): Promise<Comment> {
    return this.request<Comment>(`/comments/${commentId}`);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Notion client instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides its own credentials via headers,
 * allowing a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
export function createNotionClient(credentials: TenantCredentials): NotionClient {
  return new NotionClientImpl(credentials);
}
