// src/app/pages/budget-tracker/budget-tracker.component.ts
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { FormBuilder } from '@angular/forms';
import { Subject, switchMap, startWith, takeUntil, tap } from 'rxjs';
import { BudgetTrackerRow } from '../../../models/budget-tracker.model';
import { TpsService } from 'src/app/services/tps.service';
import { SelectItem } from 'primeng/api';

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
  expandedRowId: string | null = null;

  displayedColumns = [
    'expand',
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

  segmentOptions: SelectItem[] = [];
  cityOptions: SelectItem[] = [];

  private page = 1;
  private pageSize = 25;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadOptions();
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

  private loadOptions(): void {
    this.tpsService
      .get({ page: 1, pageSize: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        const items = res.items ?? [];
        const segments = Array.from(new Set(items.map(i => i.Header?.Segment).filter(Boolean)));
        const cities = Array.from(new Set(items.map(i => i.Header?.City).filter(Boolean)));
        this.segmentOptions = segments.map(s => ({ label: s!, value: s! }));
        this.cityOptions = cities.map(c => ({ label: c!, value: c! }));
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

  toggleRow(row: BudgetTrackerRow): void {
    const id = row.Header?.RowId;
    this.expandedRowId = this.expandedRowId === id ? null : id;
  }

  isExpandedRow = (_: number, row: BudgetTrackerRow) => this.expandedRowId === row.Header?.RowId;

  onSort(sort: Sort): void {
    const data = this.rows.slice();
    if (!sort.active || sort.direction === '') {
      this.rows = data;
      return;
    }

    this.rows = data.sort((a, b) => {
      const valueA = this.getSortValue(a, sort.active);
      const valueB = this.getSortValue(b, sort.active);
      const comparator = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return sort.direction === 'asc' ? comparator : -comparator;
    });
  }

  private getSortValue(row: BudgetTrackerRow, column: string): any {
    switch (column) {
      case 'ClaimMonthYear':
        return row.Header?.ClaimMonthYear ?? '';
      case 'Segment':
        return row.Header?.Segment ?? '';
      case 'City':
        return row.Header?.City ?? '';
      case 'Vendor':
        return row.FT?.Vendor ?? '';
      case 'Market':
        return row.FT?.Market ?? '';
      case 'Status':
        return row.FT?.Status ?? '';
      case 'FinalCost':
        return row.DUEJ?.FinalCost ?? 0;
      case 'TotalDollarsAllIn':
        return row.BVCN?.TotalDollarsAllIn ?? 0;
      default:
        return '';
    }
  }

  detailSections(row: BudgetTrackerRow): { title: string; data: any }[] {
    return [
      { title: 'FT', data: row.FT },
      { title: 'UAE', data: row.UAE },
      { title: 'AFAI', data: row.AFAI },
      { title: 'AKAN', data: row.AKAN },
      { title: 'AOBC', data: row.AOBC },
      { title: 'BVCN', data: row.BVCN },
      { title: 'CODH', data: row.CODH },
      { title: 'DLDT', data: row.DLDT },
      { title: 'DUEJ', data: row.DUEJ },
    ].filter(s => s.data);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj).filter(k => k !== 'RowId');
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
