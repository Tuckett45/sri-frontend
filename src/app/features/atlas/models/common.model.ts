/**
 * Common data models shared across ATLAS features
 * These models are used for pagination, error handling, and API responses
 */

/**
 * Metadata for paginated API responses
 * Provides information about the current page, total count, and navigation links
 */
export interface PaginationMetadata {
  /** Current page number (1-based) */
  currentPage: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Total number of items across all pages */
  totalCount: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Cursor for next page (cursor-based pagination) */
  nextCursor?: string;
  
  /** Cursor for previous page (cursor-based pagination) */
  previousCursor?: string;
  
  /** Link to next page */
  nextLink?: string;
  
  /** Link to previous page */
  previousLink?: string;
}

/**
 * Generic paginated result wrapper
 * Wraps a collection of items with pagination metadata
 * 
 * @template T The type of items in the result
 */
export interface PagedResult<T> {
  /** Array of items for the current page */
  items: T[];
  
  /** Pagination metadata */
  pagination: PaginationMetadata;
}

/**
 * RFC 7807 Problem Details for HTTP APIs
 * Standard error response format for ATLAS API errors
 * 
 * @see https://tools.ietf.org/html/rfc7807
 */
export interface ProblemDetails {
  /** URI reference that identifies the problem type */
  type?: string;
  
  /** Short, human-readable summary of the problem type */
  title?: string;
  
  /** HTTP status code */
  status?: number;
  
  /** Human-readable explanation specific to this occurrence */
  detail?: string;
  
  /** URI reference that identifies the specific occurrence */
  instance?: string;
  
  /** Additional problem-specific properties */
  [key: string]: any;
}
