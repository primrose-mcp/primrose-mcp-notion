/**
 * Notion Entity Types
 *
 * Type definitions for Notion API entities.
 */

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationParams {
  /** Cursor for pagination */
  startCursor?: string;
  /** Number of items to return (max 100) */
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  /** Array of items */
  results: T[];
  /** Whether there are more items */
  hasMore: boolean;
  /** Cursor for next page */
  nextCursor?: string;
  /** Object type (always "list") */
  object: 'list';
  /** Type of objects in the list */
  type?: string;
}

// =============================================================================
// Rich Text
// =============================================================================

export interface RichTextItem {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  mention?: {
    type: 'user' | 'page' | 'database' | 'date' | 'link_preview';
    user?: UserReference;
    page?: { id: string };
    database?: { id: string };
    date?: { start: string; end?: string };
    link_preview?: { url: string };
  };
  equation?: {
    expression: string;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
  plain_text?: string;
  href?: string | null;
}

// =============================================================================
// User
// =============================================================================

export interface User {
  object: 'user';
  id: string;
  type?: 'person' | 'bot';
  name?: string;
  avatar_url?: string | null;
  person?: {
    email?: string;
  };
  bot?: {
    owner?: {
      type: 'workspace' | 'user';
      workspace?: boolean;
      user?: UserReference;
    };
    workspace_name?: string | null;
  };
}

export interface UserReference {
  object: 'user';
  id: string;
}

// =============================================================================
// Page
// =============================================================================

export interface Page {
  object: 'page';
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: UserReference;
  last_edited_by: UserReference;
  cover?: FileCover | null;
  icon?: IconObject | null;
  parent: PageParent;
  archived: boolean;
  in_trash: boolean;
  properties: Record<string, PropertyValue>;
  url: string;
  public_url?: string | null;
}

export type PageParent =
  | { type: 'database_id'; database_id: string }
  | { type: 'page_id'; page_id: string }
  | { type: 'workspace'; workspace: true }
  | { type: 'block_id'; block_id: string };

export interface FileCover {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string; expiry_time: string };
}

export interface IconObject {
  type: 'emoji' | 'external' | 'file';
  emoji?: string;
  external?: { url: string };
  file?: { url: string; expiry_time: string };
}

// =============================================================================
// Database
// =============================================================================

export interface Database {
  object: 'database';
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: UserReference;
  last_edited_by: UserReference;
  title: RichTextItem[];
  description: RichTextItem[];
  icon?: IconObject | null;
  cover?: FileCover | null;
  properties: Record<string, DatabaseProperty>;
  parent: PageParent;
  url: string;
  public_url?: string | null;
  archived: boolean;
  in_trash: boolean;
  is_inline: boolean;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

// =============================================================================
// Block Types
// =============================================================================

export interface Block {
  object: 'block';
  id: string;
  parent: BlockParent;
  type: BlockType;
  created_time: string;
  last_edited_time: string;
  created_by: UserReference;
  last_edited_by: UserReference;
  has_children: boolean;
  archived: boolean;
  in_trash: boolean;
  [key: string]: unknown;
}

export type BlockParent =
  | { type: 'database_id'; database_id: string }
  | { type: 'page_id'; page_id: string }
  | { type: 'block_id'; block_id: string }
  | { type: 'workspace'; workspace: true };

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'to_do'
  | 'toggle'
  | 'child_page'
  | 'child_database'
  | 'embed'
  | 'image'
  | 'video'
  | 'file'
  | 'pdf'
  | 'bookmark'
  | 'callout'
  | 'quote'
  | 'equation'
  | 'divider'
  | 'table_of_contents'
  | 'column'
  | 'column_list'
  | 'link_preview'
  | 'synced_block'
  | 'template'
  | 'link_to_page'
  | 'table'
  | 'table_row'
  | 'audio'
  | 'code'
  | 'breadcrumb'
  | 'unsupported';

// =============================================================================
// Comment
// =============================================================================

export interface Comment {
  object: 'comment';
  id: string;
  parent:
    | { type: 'page_id'; page_id: string }
    | { type: 'block_id'; block_id: string };
  discussion_id: string;
  created_time: string;
  last_edited_time: string;
  created_by: UserReference;
  rich_text: RichTextItem[];
}

// =============================================================================
// Property Values
// =============================================================================

export type PropertyValue =
  | TitlePropertyValue
  | RichTextPropertyValue
  | NumberPropertyValue
  | SelectPropertyValue
  | MultiSelectPropertyValue
  | DatePropertyValue
  | PeoplePropertyValue
  | FilesPropertyValue
  | CheckboxPropertyValue
  | UrlPropertyValue
  | EmailPropertyValue
  | PhoneNumberPropertyValue
  | FormulaPropertyValue
  | RelationPropertyValue
  | RollupPropertyValue
  | CreatedTimePropertyValue
  | CreatedByPropertyValue
  | LastEditedTimePropertyValue
  | LastEditedByPropertyValue
  | StatusPropertyValue
  | UniqueIdPropertyValue;

export interface TitlePropertyValue {
  id: string;
  type: 'title';
  title: RichTextItem[];
}

export interface RichTextPropertyValue {
  id: string;
  type: 'rich_text';
  rich_text: RichTextItem[];
}

export interface NumberPropertyValue {
  id: string;
  type: 'number';
  number: number | null;
}

export interface SelectPropertyValue {
  id: string;
  type: 'select';
  select: { id: string; name: string; color: string } | null;
}

export interface MultiSelectPropertyValue {
  id: string;
  type: 'multi_select';
  multi_select: Array<{ id: string; name: string; color: string }>;
}

export interface DatePropertyValue {
  id: string;
  type: 'date';
  date: { start: string; end?: string | null; time_zone?: string | null } | null;
}

export interface PeoplePropertyValue {
  id: string;
  type: 'people';
  people: UserReference[];
}

export interface FilesPropertyValue {
  id: string;
  type: 'files';
  files: Array<{
    name: string;
    type: 'external' | 'file';
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  }>;
}

export interface CheckboxPropertyValue {
  id: string;
  type: 'checkbox';
  checkbox: boolean;
}

export interface UrlPropertyValue {
  id: string;
  type: 'url';
  url: string | null;
}

export interface EmailPropertyValue {
  id: string;
  type: 'email';
  email: string | null;
}

export interface PhoneNumberPropertyValue {
  id: string;
  type: 'phone_number';
  phone_number: string | null;
}

export interface FormulaPropertyValue {
  id: string;
  type: 'formula';
  formula: {
    type: 'string' | 'number' | 'boolean' | 'date';
    string?: string | null;
    number?: number | null;
    boolean?: boolean | null;
    date?: { start: string; end?: string | null } | null;
  };
}

export interface RelationPropertyValue {
  id: string;
  type: 'relation';
  relation: Array<{ id: string }>;
  has_more?: boolean;
}

export interface RollupPropertyValue {
  id: string;
  type: 'rollup';
  rollup: {
    type: 'number' | 'date' | 'array' | 'unsupported' | 'incomplete';
    number?: number | null;
    date?: { start: string; end?: string | null } | null;
    array?: PropertyValue[];
    function?: string;
  };
}

export interface CreatedTimePropertyValue {
  id: string;
  type: 'created_time';
  created_time: string;
}

export interface CreatedByPropertyValue {
  id: string;
  type: 'created_by';
  created_by: UserReference;
}

export interface LastEditedTimePropertyValue {
  id: string;
  type: 'last_edited_time';
  last_edited_time: string;
}

export interface LastEditedByPropertyValue {
  id: string;
  type: 'last_edited_by';
  last_edited_by: UserReference;
}

export interface StatusPropertyValue {
  id: string;
  type: 'status';
  status: { id: string; name: string; color: string } | null;
}

export interface UniqueIdPropertyValue {
  id: string;
  type: 'unique_id';
  unique_id: { number: number; prefix: string | null };
}

// =============================================================================
// Search
// =============================================================================

export interface SearchFilter {
  value: 'page' | 'database';
  property: 'object';
}

export interface SearchSort {
  direction: 'ascending' | 'descending';
  timestamp: 'last_edited_time';
}

// =============================================================================
// Database Query
// =============================================================================

export interface DatabaseFilter {
  [key: string]: unknown;
}

export interface DatabaseSort {
  property?: string;
  timestamp?: 'created_time' | 'last_edited_time';
  direction: 'ascending' | 'descending';
}

// =============================================================================
// Response Format
// =============================================================================

export type ResponseFormat = 'json' | 'markdown';
