import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MyWorkService, WorkItem, MyWorkResponse } from '../../../../services/my-work.service';

@Component({
  selector: 'app-my-work-widget',
  templateUrl: './my-work-widget.component.html',
  styleUrls: ['./my-work-widget.component.scss']
})
export class MyWorkWidgetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;
  error: string | null = null;
  workItems: WorkItem[] = [];
  role = '';

  // Pagination
  pageSize = 5;
  currentPage = 0;

  get totalPages(): number {
    return Math.ceil(this.workItems.length / this.pageSize);
  }

  get paginatedItems(): WorkItem[] {
    const start = this.currentPage * this.pageSize;
    return this.workItems.slice(start, start + this.pageSize);
  }

  get showingStart(): number {
    return this.currentPage * this.pageSize + 1;
  }

  get showingEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.workItems.length);
  }

  constructor(private myWorkService: MyWorkService, private router: Router) {}

  ngOnInit(): void {
    this.myWorkService.getMyWork()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: MyWorkResponse) => {
          this.workItems = response.items;
          this.role = response.role;
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load work items.';
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      job_assignment: 'work',
      quote_validation: 'fact_check',
      pto_approval: 'event_available',
      timecard_approval: 'schedule',
      expense_approval: 'receipt_long'
    };
    return icons[type] || 'task';
  }

  getChipColor(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'pending') return 'warn';
    if (s === 'assigned' || s === 'active') return 'primary';
    return 'accent';
  }

  navigateTo(item: WorkItem): void {
    switch (item.referenceType) {
      case 'job':
        this.router.navigate(['/field-resource-management/jobs', item.referenceId]);
        break;
      case 'quote':
        this.router.navigate(['/field-resource-management/quotes', item.referenceId]);
        break;
      case 'pto_request':
        this.router.navigate(['/field-resource-management/pto']);
        break;
      case 'time_entry':
        this.router.navigate(['/field-resource-management/payroll/timecards']);
        break;
      default:
        this.router.navigate(['/field-resource-management']);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  trackById(_: number, item: WorkItem): string {
    return item.id;
  }
}
