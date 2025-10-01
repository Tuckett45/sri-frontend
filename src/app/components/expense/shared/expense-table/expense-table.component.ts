import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
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
  private _expenses: Expense[] = [];

  @Input()
  set expenses(value: Expense[] | null) {
    this._expenses = value ?? [];
    this.dataSource.data = this._expenses;
    this.rebindTableHelpers();
  }

  get expenses(): Expense[] {
    return this._expenses;
  }

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

  getReceiptUrl(exp: Expense): string | null {
    const blobUrl = (exp as any)?.images?.[0]?.blobUrl as string | undefined;
    if (blobUrl) return blobUrl;

    const url = (exp as any)?.receiptUrl as string | undefined;
    if (!url) return null;

    if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return url;

    const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(url);
    return looksBase64 ? `data:image/jpeg;base64,${url.replace(/\s+/g, '')}` : url;
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

  openGallery(expense: Expense): void {
    const url = this.getReceiptUrl(expense);
    if (!url) return;
    this.galleryImages = [{ itemImageSrc: url }];
    this.isReceiptGalleryVisible = true;
  }

  openInNewTab(expense: Expense): void {
    const url = this.getReceiptUrl(expense);
    if (!url) return;
    window.open(url, '_blank', 'noopener');
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
    base.push('job', 'phase', 'amount', 'notes', 'receipt', 'status');

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
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }
}


