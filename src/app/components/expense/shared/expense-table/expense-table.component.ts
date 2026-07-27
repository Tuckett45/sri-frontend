import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Expense, ExpenseStatus } from 'src/app/models/expense.model';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { MatIcon } from "@angular/material/icon";
import { Tag } from "primeng/tag";
import { GalleriaModule } from "primeng/galleria";

export interface ExpenseSelectionChange {
  selectedIds: string[];
  selectedExpenses: Expense[];
}

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss']
})
export class ExpenseTableComponent implements AfterViewInit, OnChanges {
  private static readonly imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif']);

  private _expenses: Expense[] = [];
  private _serverPagination = false;
  private _pageSize = 10;
  private _pageIndex = 0;
  private _totalItems = 0;
  private readonly selection = new SelectionModel<Expense>(
    true,
    [],
    true,
    (a, b) => (a?.id ?? '') === (b?.id ?? '')
  );

  @Input()
  set expenses(value: Expense[] | null) {
    this._expenses = value ?? [];
    this.dataSource.data = this._expenses;
    this.rebindTableHelpers();
    this.syncSelectionWithInputs();
    if (!this.serverPagination && this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    if (typeof this.dataSource._updateChangeSubscription === 'function') {
      this.dataSource._updateChangeSubscription();
    }
  }

  get expenses(): Expense[] {
    return this._expenses;
  }

  @Input()
  set serverPagination(value: boolean) {
    this._serverPagination = !!value;
    this.rebindTableHelpers();
  }
  get serverPagination(): boolean {
    return this._serverPagination;
  }

  @Input()
  set pageSize(value: number) {
    this._pageSize = Number.isFinite(value) && value > 0 ? value : 10;
    if (this.paginator) {
      this.paginator.pageSize = this._pageSize;
    }
  }
  get pageSize(): number {
    return this._pageSize;
  }

  @Input()
  set pageIndex(value: number) {
    this._pageIndex = Number.isFinite(value) && value >= 0 ? value : 0;
    if (this.paginator) {
      this.paginator.pageIndex = this._pageIndex;
    }
  }
  get pageIndex(): number {
    return this._pageIndex;
  }

  @Input()
  set totalItems(value: number) {
    this._totalItems = Number.isFinite(value) && value >= 0 ? value : 0;
    if (this.paginator && this.serverPagination) {
      this.paginator.length = this._totalItems;
    }
  }
  get totalItems(): number {
    return this._totalItems;
  }

  @Input() pageSizeOptions: number[] = [5, 10, 25];

  @Input() showActions = true;
  @Input() loading = false;
  @Input() showAddButton = false;
  @Input() addButtonLabel = 'Add Expense';
  @Input() emptyStateMessage = 'No expenses to display.';
  @Input() showEmployeeColumn = false;
  @Input() enableEdit = true;
  @Input() enableDelete = true;
  @Input() enableApproval = false;
  @Input() enableSelection = false;
  @Input() selectedExpenseIds: ReadonlyArray<string> | ReadonlySet<string> = [];
  @Input() pendingStatusIds: ReadonlyArray<string> | Set<string> | null = null;

  @Output() add = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Expense>();
  @Output() delete = new EventEmitter<Expense>();
  @Output() approve = new EventEmitter<Expense>();
  @Output() reject = new EventEmitter<Expense>();
  @Output() selectionChange = new EventEmitter<ExpenseSelectionChange>();
  @Output() pageChange = new EventEmitter<PageEvent>();

  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<Expense>([]);

  isReceiptGalleryVisible = false;
  galleryImages: Array<{ itemImageSrc: string }> = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    this.configureDisplayedColumns();
  }

  ngAfterViewInit(): void {
    this.rebindTableHelpers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['showActions'] ||
      changes['showEmployeeColumn'] ||
      changes['enableApproval'] ||
      changes['enableEdit'] ||
      changes['enableDelete'] ||
      changes['enableSelection']
    ) {
      this.configureDisplayedColumns();
    }
    if (changes['expenses'] || changes['selectedExpenseIds'] || changes['enableSelection']) {
      this.syncSelectionWithInputs();
    }
  }

  onAddClicked(): void {
    this.add.emit();
  }

  onEdit(expense: Expense): void {
    this.edit.emit(expense);
  }

  onDelete(expense: Expense): void {
    this.delete.emit(expense);
  }

  onApprove(expense: Expense): void {
    this.approve.emit(expense);
  }

  onReject(expense: Expense): void {
    this.reject.emit(expense);
  }

  isSelected(expense: Expense): boolean {
    return this.selection.isSelected(expense);
  }

  toggleRow(expense: Expense, checked: boolean): void {
    if (!this.enableSelection || this.isStatusPending(expense) || !expense.id) return;
    checked ? this.selection.select(expense) : this.selection.deselect(expense);
    this.emitSelectionChange();
  }

  toggleAllRows(checked: boolean): void {
    if (!this.enableSelection) return;
    if (checked) {
      const selectable = this.dataSource.data.filter(exp => !this.isStatusPending(exp) && !!exp.id);
      this.selection.select(...selectable);
    } else {
      this.selection.clear();
    }
    this.emitSelectionChange();
  }

  isAllSelected(): boolean {
    if (!this.enableSelection) return false;
    const selectable = this.dataSource.data.filter(exp => !this.isStatusPending(exp) && !!exp.id);
    return selectable.length > 0 && selectable.every(exp => this.selection.isSelected(exp));
  }

  isIndeterminate(): boolean {
    if (!this.enableSelection) return false;
    const selectableCount = this.dataSource.data.filter(exp => !this.isStatusPending(exp) && !!exp.id).length;
    const selectedCount = this.selection.selected.filter(exp => !this.isStatusPending(exp) && !!exp.id).length;
    return selectedCount > 0 && selectedCount < selectableCount;
  }

  canEdit(): boolean {
    return this.showActions && this.enableEdit;
  }

  canDelete(): boolean {
    return this.showActions && this.enableDelete;
  }

  canApproveOrReject(): boolean {
    return this.showActions && this.enableApproval;  
  }

  hasActionColumn(): boolean {
    return this.shouldShowActionsColumn();
  }  

  isStatusPending(expense: Expense): boolean {
    if (!expense.id || !this.pendingStatusIds) return false;
    if (Array.isArray(this.pendingStatusIds)) {
      return this.pendingStatusIds.includes(expense.id);
    }
    if (this.pendingStatusIds instanceof Set) {
      return this.pendingStatusIds.has(expense.id);
    }
    return false;
  }

  getReceiptResource(exp: Expense): { url: string; kind: 'image' | 'pdf' | 'file' } | null {
    const imageMeta = ((exp as any)?.images?.[0] ?? {}) as {
      blobUrl?: string;
      contentType?: string | null;
      fileName?: string | null;
    };

    let rawUrl = imageMeta.blobUrl ?? (exp as any)?.receiptUrl;
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
    rawUrl = rawUrl.trim();

    const lowerContentType = (imageMeta.contentType ?? '').toLowerCase();
    const ext = this.extractExtension(imageMeta.fileName ?? rawUrl);

    const isDataUrl = /^data:/i.test(rawUrl);
    const isHttp = /^(https?:)?\/\//i.test(rawUrl);
    const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(rawUrl);

    let mimeType = this.inferMimeType(lowerContentType, ext, rawUrl);

    let normalizedUrl = rawUrl;
    if (!isHttp && !isDataUrl && looksBase64) {
      const effectiveMime = mimeType || 'application/octet-stream';
      normalizedUrl = `data:${effectiveMime};base64,${rawUrl.replace(/\s+/g, '')}`;
      mimeType = effectiveMime;
    }

    if (!mimeType && isDataUrl) {
      const match = /^data:([^;,]+)/i.exec(normalizedUrl);
      mimeType = match?.[1]?.toLowerCase() || '';
    }

    const kind = this.resolveKind(mimeType, ext, normalizedUrl);
    return { url: normalizedUrl, kind };
  }

  getNotes(expense: Expense): string {
    const candidates = [
      expense.descriptionNotes,
      (expense as any)?.description,
      (expense as any)?.notes
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return '';
  }

  openReceipt(expense: Expense): void {
    const resource = this.getReceiptResource(expense);
    if (!resource) return;

    if (resource.kind === 'image') {
      this.galleryImages = [{ itemImageSrc: resource.url }];
      this.isReceiptGalleryVisible = true;
      return;
    }

    window.open(resource.url, '_blank', 'noopener');
  }

  openInNewTab(expense: Expense): void {
    const resource = this.getReceiptResource(expense);
    if (!resource) return;
    window.open(resource.url, '_blank', 'noopener');
  }

  getStatusSeverity(status: string | ExpenseStatus | undefined): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case ExpenseStatus.Approved:
      case ExpenseStatus.Paid:
        return 'success';
      case ExpenseStatus.Pending:
        return 'warn';
      case ExpenseStatus.Rejected:
        return 'danger';
      default:
        return 'info';
    }
  }

  closeGallery(): void {
    this.isReceiptGalleryVisible = false;
  }

  trackByExpenseId(_index: number, expense: Expense): string | undefined {
    return expense.id;
  }

  private configureDisplayedColumns(): void {
    const base: string[] = [];
    if (this.enableSelection) {
      base.push('select');
    }
    base.push('date');
    if (this.showEmployeeColumn) {
      base.push('employee');
    }
    base.push('job', 'category', 'amount', 'notes', 'receipt', 'status');

    if (this.shouldShowActionsColumn()) {
      base.push('actions');
    }

    this.displayedColumns = base;
  }

  private shouldShowActionsColumn(): boolean {
    if (!this.showActions) return false;
    return this.enableEdit || this.enableDelete || this.enableApproval;
  }

  private rebindTableHelpers(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.serverPagination ? null : this.paginator;
      this.paginator.pageSize = this._pageSize;
      this.paginator.pageIndex = this._pageIndex;
      if (this.serverPagination) {
        this.paginator.length = this._totalItems;
      }
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  onPaginatorPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    if (this.serverPagination) {
      if (this.enableSelection) {
        this.selection.clear();
        this.emitSelectionChange();
      }
      this.pageChange.emit(event);
    }
  }

  private extractExtension(fileName: string | null | undefined): string {
    if (!fileName) return '';
    const match = /\.([A-Za-z0-9]+)(?:\?|#|$)/.exec(fileName);
    return match ? match[1].toLowerCase() : '';
  }

  private inferMimeType(contentType: string, ext: string, url: string): string {
    if (contentType) return contentType;

    const fromDataUrl = /^data:([^;,]+)/i.exec(url)?.[1]?.toLowerCase();
    if (fromDataUrl) return fromDataUrl;

    if (ext) {
      if (ExpenseTableComponent.imageExtensions.has(ext)) return 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
      if (ext === 'pdf') return 'application/pdf';
    }
    return '';
  }

  private resolveKind(mimeType: string, ext: string, url: string): 'image' | 'pdf' | 'file' {
    const lowerType = mimeType.toLowerCase();

    if (lowerType.startsWith('image/')) return 'image';
    if (lowerType === 'application/pdf') return 'pdf';

    if (!lowerType) {
      if (/^data:image\//i.test(url)) return 'image';
      if (/^data:application\/pdf/i.test(url) || ext === 'pdf') return 'pdf';
      const dataMime = /^data:([^;,]+)/i.exec(url)?.[1]?.toLowerCase();
      if (dataMime?.startsWith('image/')) return 'image';
      if (dataMime === 'application/pdf') return 'pdf';
    }

    if (ext && ExpenseTableComponent.imageExtensions.has(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';

    return 'file';
  }

  private emitSelectionChange(): void {
    if (!this.enableSelection) return;
    const selected = this.selection.selected;
    const ids = selected
      .map(exp => exp.id)
      .filter((id): id is string => typeof id === 'string' && !!id.trim());
    this.selectionChange.emit({ selectedIds: ids, selectedExpenses: selected });
  }

  private normalizeSelectedIds(): Set<string> {
    if (this.selectedExpenseIds instanceof Set) {
      return new Set(Array.from(this.selectedExpenseIds).filter(id => typeof id === 'string'));
    }
    if (Array.isArray(this.selectedExpenseIds)) {
      return new Set(this.selectedExpenseIds.filter(id => typeof id === 'string'));
    }
    return new Set<string>();
  }

  private syncSelectionWithInputs(): void {
    if (!this.enableSelection) {
      this.selection.clear();
      return;
    }
    const previousIds = new Set(
      this.selection.selected
        .map(exp => exp.id)
        .filter((id): id is string => typeof id === 'string' && !!id)
    );
    const lookup = this.normalizeSelectedIds();
    this.selection.clear();
    this.dataSource.data.forEach(expense => {
      const id = expense.id ?? '';
      if (id && lookup.has(id)) {
        this.selection.select(expense);
      }
    });
    const nextIds = new Set(
      this.selection.selected
        .map(exp => exp.id)
        .filter((id): id is string => typeof id === 'string' && !!id)
    );
    if (!this.areIdSetsEqual(previousIds, nextIds)) {
      this.emitSelectionChange();
    }
  }

  private areIdSetsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }
}
