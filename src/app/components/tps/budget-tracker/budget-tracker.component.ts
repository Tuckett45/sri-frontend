import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Subject, combineLatest, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { BudgetTrackerRow } from '../../../models/budget-tracker.model';
import { CityOption, MarketOption, TpsService } from 'src/app/services/tps.service';
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

  // Expanded state
  expandedRowId: string | null = null;
  expandedElement: BudgetTrackerRow | null = null;

  displayedColumns = [
    'expand',
    'claim_month_year',
    'segment',
    'city',
    'conlog',
    'vendor',
    'final_cost'
  ];

  filtersOpen = false;
  selectedFilters: { column: 'segment' | 'city' | 'claimMonth'; values: string[] }[] = [];

  // ---- Filters ----
  form = this.fb.group({
    segment: this.fb.control<string[]>([]),
    city: this.fb.control<string[]>([]),
    claimMonthFrom: this.fb.control<Date | null>(null),
    claimMonthTo: this.fb.control<Date | null>(null),
  });

  segmentOptions: SelectItem[] = [];
  cityOptions: SelectItem[] = [];

  private page = 1;
  private pageSize = 25;

  private reload$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private activeMarket?: MarketOption;
  private activeCity?: CityOption;

  constructor(private fb: FormBuilder, private tpsService: TpsService) {}

  ngOnInit(): void {
    this.activeMarket = this.tpsService.selectedMarket;
    this.activeCity = this.tpsService.selectedCity;
    this.loadOptions();

    this.reload$
      .pipe(
        startWith(void 0),
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.tpsService.get({
            segment:
              Array.isArray(this.form.value.segment) && this.form.value.segment.length
                ? this.form.value.segment.join(',')
                : undefined,
            city:
              Array.isArray(this.form.value.city) && this.form.value.city.length
                ? this.form.value.city.join(',')
                : undefined,
            market: this.activeMarket?.code ?? undefined,
            metro: this.activeCity && !this.activeCity.isAll ? this.activeCity.name : undefined,
            segmentPrefix: this.activeCity && !this.activeCity.isAll ? this.activeCity.segmentPrefix : undefined,
            claimMonthFrom: this.form.value.claimMonthFrom || undefined,
            claimMonthTo: this.form.value.claimMonthTo || undefined,
            page: this.page,
            pageSize: this.pageSize
          } as any)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res: { items?: BudgetTrackerRow[]; total?: number }) => {
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
          this.total = res.total ?? items.length;

          // If expanded row no longer exists, clear expansion
          if (
            this.expandedRowId &&
            !this.rows.some((r, i) => this.rowKey(r, i) === this.expandedRowId)
          ) {
            this.expandedRowId = null;
            this.expandedElement = null;
          }

          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });

    combineLatest([this.tpsService.selectedMarket$, this.tpsService.selectedCity$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([market, city]) => {
        this.activeMarket = market;
        this.activeCity = city;
        this.applyFilters();
        this.loadOptions(); // refresh dropdowns to match market/city scope
      });
  }

  // Pull distinct filter options once
  private loadOptions(): void {
    this.tpsService
      .get({
        page: 1,
        pageSize: 1000,
        market: this.activeMarket?.code ?? undefined,
        metro: this.activeCity && !this.activeCity.isAll ? this.activeCity.name : undefined,
        segmentPrefix: this.activeCity && !this.activeCity.isAll ? this.activeCity.segmentPrefix : undefined
      } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        const items = res.items ?? [];
        const segments = Array.from(new Set(items.map(i => i.Header?.Segment).filter(Boolean))) as string[];
        const cities = Array.from(new Set(items.map(i => i.Header?.City).filter(Boolean))) as string[];
        this.segmentOptions = segments.map(s => ({ label: s, value: s }));
        this.cityOptions = cities.map(c => ({ label: c, value: c }));
      });
  }

  // ---------- Keys / trackBy / toggling ----------
  /** Stable key for each row; falls back to a composite if RowId missing */
  private rowKey(r: BudgetTrackerRow, idx?: number): string {
    const h = r.Header || {};
    return (
      h.RowId ||
      `${h.ClaimMonthYear ?? ''}|${h.Segment ?? ''}|${h.City ?? ''}|${r.FT?.Vendor ?? ''}|${idx ?? ''}`
    );
  }

  /** Keep DOM nodes stable across sort/paginate/filter so expansion stays put */
  trackByRow = (index: number, row: BudgetTrackerRow) => this.rowKey(row, index);

  toggleRow(row: BudgetTrackerRow): void {
    const idx = this.rows.indexOf(row);
    const id = this.rowKey(row, idx);
    if (this.expandedRowId === id) {
      this.expandedRowId = null;
      this.expandedElement = null;
    } else {
      this.expandedRowId = id;
      this.expandedElement = row;
    }
  }

  isExpandedRow = (_: number, row: BudgetTrackerRow) =>
    this.expandedRowId === this.rowKey(row, this.rows.indexOf(row));

  // ---------- UI helpers ----------
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

  removeChip(filter: { column: 'segment' | 'city' | 'claimMonth'; value: string }): void {
    const v = this.form.value;

    if (filter.column === 'segment') {
      this.form.patchValue({ segment: (v.segment ?? []).filter(s => s !== filter.value) });
    } else if (filter.column === 'city') {
      this.form.patchValue({ city: (v.city ?? []).filter(c => c !== filter.value) });
    } else {
      // claimMonth chips store ISO strings
      const iso = filter.value;
      if (v.claimMonthFrom && v.claimMonthFrom.toISOString() === iso) {
        this.form.patchValue({ claimMonthFrom: null });
      }
      if (v.claimMonthTo && v.claimMonthTo.toISOString() === iso) {
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

  private applyFilters(): void {
    this.page = 1;
    if (this.paginator) this.paginator.firstPage();
    this.reload$.next();
  }

  formatDate(chip: string): string {
    const d = new Date(chip);
    return isNaN(d.getTime()) ? chip : d.toLocaleDateString();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    // Optional: collapse when paging
    // this.expandedRowId = null;
    // this.expandedElement = null;
    this.reload$.next();
  }

  onSort(sort: Sort): void {
    const data = this.rows.slice();
    if (!sort.active || sort.direction === '') {
      this.rows = data;
      return;
    }

    this.rows = data.sort((a, b) => {
      const valueA = this.getSortValue(a, sort.active);
      const valueB = this.getSortValue(b, sort.active);

      const numA = typeof valueA === 'number' ? valueA : (isNaN(+valueA as any) ? null : +(<any>valueA));
      const numB = typeof valueB === 'number' ? valueB : (isNaN(+valueB as any) ? null : +(<any>valueB));

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

    // Keep expansion attached to the same element if it's still present
    if (this.expandedElement) {
      const newIdx = this.rows.indexOf(this.expandedElement);
      this.expandedRowId = newIdx >= 0 ? this.rowKey(this.expandedElement, newIdx) : null;
      if (newIdx < 0) this.expandedElement = null;
    }
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
    const header = row.Header ? { ...row.Header } : null;
    if (header) {
      delete (header as any).RowId;
      delete (header as any).ClaimMonthYear;
      delete (header as any).Segment;
      delete (header as any).City;
    }

    const sections = [
      { title: 'Header', data: header },
      { title: 'FT', data: row.FT },
      { title: 'UAE', data: row.UAE },
      { title: 'AFAI', data: row.AFAI },
      { title: 'AKAN', data: row.AKAN },
      { title: 'AOBC', data: row.AOBC },
      { title: 'BVCN', data: row.BVCN },
      { title: 'CODH', data: row.CODH },
      { title: 'DLDT', data: row.DLDT },
      { title: 'DUEJ', data: row.DUEJ },
    ];

    return sections.filter(s => s.data && this.objectEntries(s.data).length > 0);
  }

  objectEntries(obj: any): { key: string; value: any }[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj)
      .filter(([k, v]) => k !== 'RowId' && v !== null && v !== undefined && v !== '')
      .map(([key, value]) => ({ key, value }));
  }

  isLink(key: string): boolean {
    return key.toLowerCase().includes('link');
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
