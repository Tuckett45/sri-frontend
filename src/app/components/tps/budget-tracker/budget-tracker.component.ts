import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
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
  expandedRowId: string | null = null;

  // Column ids should match your template matColumnDef
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
  filtersOpen = false;
  selectedFilters: { column: string; values: string[] }[] = [];

  filtersOpen = false;
  selectedFilters: { column: string; values: string[] }[] = [];

  // ---- Filters (only what you actually use) ----
  form = this.fb.group({
    segment: <string[]>[],
    city: <string[]>[],
    claimMonthFrom: <Date | null>(null),
    claimMonthTo: <Date | null>(null),
  });

  segmentOptions: string[] = [];
  cityOptions: string[] = [];

  private page = 1;
  private pageSize = 25;
  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadOptions();

    // Load on start and whenever filters/page change
    this.reload$
      .pipe(
        startWith(void 0),
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.tpsService.get({
            segment: (this.form.value.segment?.length ? this.form.value.segment.join(',') : undefined),
            city: (this.form.value.city?.length ? this.form.value.city.join(',') : undefined),
            claimMonthFrom: this.form.value.claimMonthFrom || undefined,
            claimMonthTo: this.form.value.claimMonthTo || undefined,
            page: this.page,
            pageSize: this.pageSize
          } as any)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: res => {
          const v = this.form.value;
          let items = res.items ?? [];

          // Client-side filtering that matches the form types
          items = items.filter(r => {
            const seg = r.Header?.Segment ?? '';
            const city = r.Header?.City ?? '';
            const vendor = r.FT?.Vendor ?? '';
            const market = r.FT?.Market ?? '';
            const status = r.FT?.Status ?? '';
            const cm = r.Header?.ClaimMonthYear ? new Date(r.Header.ClaimMonthYear) : null;

            return (
              (!v.segment?.length || v.segment.includes(seg)) &&
              (!v.city?.length || v.city.includes(city)) &&
              (!v.claimMonthFrom || (cm && cm >= v.claimMonthFrom)) &&
              (!v.claimMonthTo || (cm && cm <= v.claimMonthTo))
            );
          });

          this.rows = items;
          this.total = res.total ?? items.length;
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
        this.segmentOptions = segments as string[];
        this.cityOptions = cities as string[];
      });
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  private applyFilters(): void {
    this.page = 1;
    if (this.paginator) this.paginator.firstPage();
    this.reload$.next();
  }

  onFilterChange(column: string): void {
    const val = this.form.value;
    let values: string[] = [];
    if (column === 'segment') {
      values = val.segment || [];
    } else if (column === 'city') {
      values = val.city || [];
    } else if (column === 'claimMonth') {
      values = [val.claimMonthFrom, val.claimMonthTo].filter(Boolean).map((d: Date) => d.toString());
      column = 'claimMonth';
    }
    this.selectedFilters = this.selectedFilters.filter(f => f.column !== column);
    if (values.length > 0) {
      this.selectedFilters.push({ column, values });
    }
    this.applyFilters();
  }

  removeChip(filter: { column: string; value: string }): void {
    const val = this.form.value;
    if (filter.column === 'segment') {
      this.form.patchValue({ segment: (val.segment || []).filter((v: string) => v !== filter.value) });
    } else if (filter.column === 'city') {
      this.form.patchValue({ city: (val.city || []).filter((v: string) => v !== filter.value) });
    } else if (filter.column === 'claimMonth') {
      if (val.claimMonthFrom && val.claimMonthFrom.toString() === filter.value) {
        this.form.patchValue({ claimMonthFrom: null });
      }
      if (val.claimMonthTo && val.claimMonthTo.toString() === filter.value) {
        this.form.patchValue({ claimMonthTo: null });
      }
    }
    this.onFilterChange(filter.column);
  }

  clearAll(): void {
    this.form.reset({ segment: [], city: [], claimMonthFrom: null, claimMonthTo: null });
    this.selectedFilters = [];
    this.applyFilters();
  }

  formatDate(chip: any): string {
    const d = new Date(chip);
    return isNaN(d.getTime()) ? chip : d.toLocaleDateString();
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

      const numA = typeof valueA === 'number' ? valueA : (isNaN(+valueA) ? valueA : +valueA);
      const numB = typeof valueB === 'number' ? valueB : (isNaN(+valueB) ? valueB : +valueB);

      const comparator = numA < numB ? -1 : numA > numB ? 1 : 0;
      return sort.direction === 'asc' ? comparator : -comparator;
    });
  }

  /** Map sort column id (from template) to the data value */
  private getSortValue(row: BudgetTrackerRow, column: string): any {
    switch (column) {
      case 'claim_month_year':
        return row.Header?.ClaimMonthYear ?? '';
      case 'segment':
        return row.Header?.Segment ?? '';
      case 'city':
        return row.Header?.City ?? '';
      case 'vendor':
        return row.FT?.Vendor ?? '';
      case 'market':
        return row.FT?.Market ?? '';
      case 'status':
        return row.FT?.Status ?? '';
      case 'final_cost':
        return row.DUEJ?.FinalCost ?? 0;
      case 'total_dollars_all_in':
        return row.BVCN?.TotalDollarsAllIn ?? 0;
      default:
        return '';
    }
  }

  detailSections(row: BudgetTrackerRow): { title: string; data: any }[] {
    return [
      { title: 'FT',   data: row.FT },
      { title: 'UAE',  data: row.UAE },
      { title: 'AFAI', data: row.AFAI },
      { title: 'AKAN', data: row.AKAN },
      { title: 'AOBC', data: row.AOBC },
      { title: 'BVCN', data: row.BVCN },
      { title: 'CODH', data: row.CODH },
      { title: 'DLDT', data: row.DLDT },
      { title: 'DUEJ', data: row.DUEJ }
    ].filter(s => s.data);
  }

  objectEntries(obj: any): { key: string; value: any }[] {
    return Object.entries(obj)
      .filter(([k, v]) => k !== 'RowId' && v !== null && v !== undefined && v !== '')
      .map(([key, value]) => ({ key, value }));
  }

  labelize(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^\w|\s\w/g, m => m.toUpperCase());
  }

  asDate(v?: string | null): string {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
