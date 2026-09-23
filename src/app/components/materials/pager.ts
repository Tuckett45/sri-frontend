/**
 * Lightweight client-side pagination helper for the Materials lists.
 *
 * Holds the full source array plus the current page/pageSize, and exposes the
 * current slice along with navigation helpers. All Materials lists are already
 * loaded into memory, so paging is a pure client-side slice — no API changes.
 */
export class Pager<T> {
  private source: readonly T[] = [];
  page = 1;

  constructor(public pageSize = 10) {}

  /** Replace the backing data and reset to the first page. */
  setItems(items: readonly T[] | null | undefined): void {
    this.source = items ?? [];
    this.clampPage();
  }

  /** Total number of items across all pages. */
  get total(): number {
    return this.source.length;
  }

  /** Total number of pages (at least 1). */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.source.length / this.pageSize));
  }

  /** The items visible on the current page. */
  get items(): T[] {
    const start = (this.page - 1) * this.pageSize;
    return this.source.slice(start, start + this.pageSize);
  }

  /** 1-based index of the first item shown (0 when empty). */
  get firstItemIndex(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  /** 1-based index of the last item shown on the current page. */
  get lastItemIndex(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get hasPrev(): boolean {
    return this.page > 1;
  }

  get hasNext(): boolean {
    return this.page < this.totalPages;
  }

  /** Whether pager controls are worth showing (more than one page). */
  get isPaged(): boolean {
    return this.totalPages > 1;
  }

  prev(): void {
    if (this.hasPrev) this.page--;
  }

  next(): void {
    if (this.hasNext) this.page++;
  }

  setPageSize(size: number): void {
    this.pageSize = size > 0 ? size : 10;
    this.clampPage();
  }

  private clampPage(): void {
    if (this.page > this.totalPages) this.page = this.totalPages;
    if (this.page < 1) this.page = 1;
  }
}
