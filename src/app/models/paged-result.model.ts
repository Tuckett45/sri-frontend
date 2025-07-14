export interface PagedResult<T> {
  [x: string]: any;
  items: T[];
  totalCount: number;
}
