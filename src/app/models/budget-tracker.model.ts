export interface BudgetTrackerRow {
  Rowid: string;                 // RowId
  ConlogLink?: string | null;
  ClaimMonthYear?: string | null; // API returns ISO date; keep string or Date
  segment?: string | null;
  City?: string | null;
  Crew?: string | null;

  Vendor?: string | null;
  Market?: string | null;
  Status?: string | null;

  final_cost?: number | null;    // from DU–EJ
  total_dollars_all_in?: number | null; // from BV–CN
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}