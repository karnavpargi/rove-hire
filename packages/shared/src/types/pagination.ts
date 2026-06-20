/**
 * Pagination types shared between frontend and backend.
 */

/** Paginated query result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Input for pagination parameters */
export interface PaginationInput {
  page?: number;
  pageSize?: number;
}
