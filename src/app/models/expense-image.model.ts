export class ExpenseImage {
  id?: string;
  expenseId!: string;
  blobUrl!: string;          // <— aligns to DB/API
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  createdBy?: string | null;
  createdDate?: string;      // ISO string from API
}