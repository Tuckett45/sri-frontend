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

  // ---- Filters ----
  form = this.fb.group({
    segment: this.fb.control<string[]>([]),               
    city: this.fb.control<string[]>([]),                  
    claimMonthFrom: this.fb.control<Date | null>(null),    
    claimMonthTo: this.fb.control<Date | null>(null),      
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
    this.reload$
      .pipe(
        startWith(void 0),
        tap(() => (this.loading = true)),
        switchMap(() => {
          const v = this.form.value;
          const segs = v.segment ?? [];
          const cities = v.city ?? [];
          return this.tpsService.get({
            segment: segs.length ? segs.join(',') : undefined,
            city: cities.length ? cities.join(',') : undefined,
            claimMonthFrom: v.claimMonthFrom || undefined,
            claimMonthTo: v.claimMonthTo || undefined,
            page: this.page,
            pageSize: this.pageSize
          } as any);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: res => {
          const v = this.form.value;
          const segs = v.segment ?? [];
          const cities = v.city ?? [];

          let items = (res.items ?? []).filter(r => {
            const seg = r.Header?.Segment ?? '';
            const city = r.Header?.City ?? '';
            const cm = r.Header?.ClaimMonthYear ? new Date(r.Header.ClaimMonthYear) : null;

            return (
              (segs.length === 0 || segs.includes(seg)) &&
              (cities.length === 0 || cities.includes(city)) &&
              (!v.claimMonthFrom || (cm && cm >= v.claimMonthFrom)) &&
              (!v.claimMonthTo || (cm && cm <= v.claimMonthTo))
            );
          });

          this.rows = items;
          this.total = items.length; 
          this.loading = false;
        },
        error: _ => { this.loading = false; }
      });
  }

  private loadOptions(): void {
    this.tpsService
      .get({ page: 1, pageSize: 1000 } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        const items = res.items ?? [];
        const segments = Array.from(new Set(items.map(i => i.Header?.Segment).filter(Boolean))) as string[];
        const cities = Array.from(new Set(items.map(i => i.Header?.City).filter(Boolean))) as string[];
        this.segmentOptions = segments;
        this.cityOptions = cities;
      });
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  onFilterChange(column: 'segment' | 'city' | 'claimMonth'): void {
    const v = this.form.value;
    let values: string[] = [];

    if (column === 'segment') {
      values = (v.segment ?? []) as string[];
    } else if (column === 'city') {
      values = (v.city ?? []) as string[];
    } else {
      values = [v.claimMonthFrom, v.claimMonthTo]
        .filter((d): d is Date => !!d)
        .map(d => d.toISOString());
    }

    this.selectedFilters = this.selectedFilters.filter(f => f.column !== column);
    if (values.length) {
      this.selectedFilters.push({ column, values });
    }

    this.applyFilters();
  }

  removeChip(filter: { column: string; value: string }): void {
    const v = this.form.value;

    if (filter.column === 'segment') {
      this.form.patchValue({ segment: (v.segment ?? []).filter(s => s !== filter.value) });
    } else if (filter.column === 'city') {
      this.form.patchValue({ city: (v.city ?? []).filter(c => c !== filter.value) });
    } else if (filter.column === 'claimMonth') {
      const iso = filter.value; 
      if (v.claimMonthFrom && v.claimMonthFrom.toISOString() === iso) {
        this.form.patchValue({ claimMonthFrom: null });
      }
      if (v.claimMonthTo && v.claimMonthTo.toISOString() === iso) {
        this.form.patchValue({ claimMonthTo: null });
      }
    }

    this.onFilterChange(filter.column as any);
  }

  clearAll(): void {
    this.form.reset({ segment: [], city: [], claimMonthFrom: null, claimMonthTo: null });
    this.selectedFilters = [];
    this.applyFilters();
  }

  applyFilters(): void {
    this.page = 1;
    if (this.paginator) this.paginator.firstPage();
    this.reload$.next();
  }

  formatDate(chip: any): string {
    const d = new Date(chip);
    return isNaN(d.getTime()) ? String(chip) : d.toLocaleDateString();
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

      const numA = typeof valueA === 'number' ? valueA : (isNaN(+valueA) ? null : +valueA);
      const numB = typeof valueB === 'number' ? valueB : (isNaN(+valueB) ? null : +valueB);

      let cmp: number;
      if (numA !== null && numB !== null) {
        cmp = numA < numB ? -1 : numA > numB ? 1 : 0;
      } else {
        const aStr = String(valueA ?? '').toLowerCase();
        const bStr = String(valueB ?? '').toLowerCase();
        cmp = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }

  private getSortValue(row: BudgetTrackerRow, column: string): any {
    switch (column) {
      case 'claim_month_year':
      case 'ClaimMonthYear':
        return row.Header?.ClaimMonthYear ?? '';
      case 'segment':
      case 'Segment':
        return row.Header?.Segment ?? '';
      case 'city':
      case 'City':
        return row.Header?.City ?? '';
      case 'vendor':
      case 'Vendor':
        return row.FT?.Vendor ?? '';
      case 'market':
      case 'Market':
        return row.FT?.Market ?? '';
      case 'status':
      case 'Status':
        return row.FT?.Status ?? '';
      case 'final_cost':
      case 'FinalCost':
        return row.DUEJ?.FinalCost ?? 0;
      case 'total_dollars_all_in':
      case 'TotalDollarsAllIn':
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
