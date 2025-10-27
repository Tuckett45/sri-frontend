import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Expense } from 'src/app/models/expense.model';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { MatIcon } from "@angular/material/icon";
import { Tag } from "primeng/tag";
import { GalleriaModule } from "primeng/galleria";

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

  @Input()
  set expenses(value: Expense[] | null) {
    this._expenses = value ?? [];
    this.dataSource.data = this._expenses;
    this.rebindTableHelpers();
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
  @Input() pendingStatusIds: ReadonlyArray<string> | Set<string> | null = null;

  @Output() add = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Expense>();
  @Output() delete = new EventEmitter<Expense>();
  @Output() approve = new EventEmitter<Expense>();
  @Output() reject = new EventEmitter<Expense>();
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
    if (changes['showActions'] || changes['showEmployeeColumn'] || changes['enableApproval'] || changes['enableEdit'] || changes['enableDelete']) {
      this.configureDisplayedColumns();
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

  closeGallery(): void {
    this.isReceiptGalleryVisible = false;
  }

  trackByExpenseId(_index: number, expense: Expense): string | undefined {
    return expense.id;
  }

  private configureDisplayedColumns(): void {
    const base: string[] = ['date'];
    if (this.showEmployeeColumn) {
      base.push('employee');
    }
    base.push('job', 'amount', 'notes', 'receipt', 'status');

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
}



