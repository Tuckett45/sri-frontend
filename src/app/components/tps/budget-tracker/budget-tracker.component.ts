// src/app/pages/budget-tracker/budget-tracker.component.ts
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { FormBuilder } from '@angular/forms';
import { Subject, switchMap, startWith, takeUntil, tap } from 'rxjs';
import { BudgetTrackerRow } from '../../../models/budget-tracker.model';
import { TpsService } from 'src/app/services/tps.service';

@Component({
  selector: 'app-budget-tracker',
  templateUrl: './budget-tracker.component.html',
  styleUrls: ['./budget-tracker.component.scss']
})
export class BudgetTrackerComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  loading = false;
  rows: BudgetTrackerRow[] = [];
  total = 0;

  displayedColumns = [
    'claim_month_year',
    'segment',
    'city',
    'vendor',
    'market',
    'status',
    'final_cost',
    'total_dollars_all_in',
    'conlog_link'
  ];

  // filters
  form = this.fb.group({
    segment: [''],
    city: [''],
    claimMonthFrom: <Date | null>(null),
    claimMonthTo: <Date | null>(null),
  });

  private page = 1;
  private pageSize = 25;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private tpsService: TpsService) {}

  ngOnInit(): void {
    // load on start and whenever filters submit or page changes
    this.reload$
      .pipe(
        startWith(void 0),
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.tpsService.get({
            segment: this.form.value.segment || undefined,
            city: this.form.value.city || undefined,
            claimMonthFrom: this.form.value.claimMonthFrom || undefined,
            claimMonthTo: this.form.value.claimMonthTo || undefined,
            page: this.page,
            pageSize: this.pageSize,
          })
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: res => {
          this.rows = res.items ?? [];
          this.total = res.total ?? 0;
          this.loading = false;
        },
        error: _ => { this.loading = false; }
      });
  }

  applyFilters(): void {
    this.page = 1;
    if (this.paginator) this.paginator.firstPage();
    this.reload$.next();
  }

  clearFilters(): void {
    this.form.reset({ segment: '', city: '', claimMonthFrom: null, claimMonthTo: null });
    this.applyFilters();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.reload$.next();
  }

  asDate(v?: string | null): string {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
  }
}
