import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, combineLatest, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { BudgetTrackerRow } from '../../../models/budget-tracker.model';
import { CityOption, MarketOption, TpsService } from 'src/app/services/tps.service';
import { SelectItem, SortEvent } from 'primeng/api';

@Component({
  selector: 'app-budget-tracker',
  templateUrl: './budget-tracker.component.html',
  styleUrls: ['./budget-tracker.component.scss']
})
export class BudgetTrackerComponent implements OnInit, OnDestroy {
  loading = false;
  rows: BudgetTrackerRow[] = [];
  total = 0;

  // Expanded state
  expandedRowKeys: Record<string, boolean> = {};

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
  pageSize = 25;
  first = 0;

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
          const startYm = this.toYearMonth(v.claimMonthFrom ?? null);
          const endYm = this.toYearMonth(v.claimMonthTo ?? null);

          let items = (res.items ?? []).filter(r => {
            const seg = r.Header?.Segment ?? '';
            const city = r.Header?.City ?? '';
            const cm = r.Header?.ClaimMonthYear ? new Date(r.Header.ClaimMonthYear) : null;
            const cmYm = this.toYearMonth(cm);
            return (
              (segs.length === 0 || segs.includes(seg)) &&
              (cities.length === 0 || cities.includes(city)) &&
              (startYm == null || (cmYm != null ? cmYm >= startYm : false)) &&
              (endYm == null || (cmYm != null ? cmYm <= endYm : false))
            );
          });

          this.rows = items.map((item, idx) => ({
            ...item,
            __rowId: this.rowKey(item, idx)
          })) as BudgetTrackerRow[];
          this.total = res.total ?? items.length;

          // If expanded row no longer exists, clear expansion
          const expandedIds = Object.keys(this.expandedRowKeys || {});
          if (expandedIds.length) {
            const exists = this.rows.some(r => (r as any).__rowId && expandedIds.includes((r as any).__rowId));
            if (!exists) this.expandedRowKeys = {};
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

  onRowExpand(event: { data: BudgetTrackerRow }): void {
    const id = (event.data as any).__rowId;
    if (!id) return;
    this.expandedRowKeys = { [id]: true };
  }

  onRowCollapse(): void {
    this.expandedRowKeys = {};
  }

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

  setClaimMonthFrom(date: Date, picker: any): void {
    this.form.patchValue({ claimMonthFrom: this.normalizeMonth(date) });
    picker.close();
    this.onFilterChange('claimMonth');
  }

  setClaimMonthTo(date: Date, picker: any): void {
    this.form.patchValue({ claimMonthTo: this.normalizeMonth(date) });
    picker.close();
    this.onFilterChange('claimMonth');
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
    this.first = 0;
    this.reload$.next();
  }

  formatDate(chip: string): string {
    const d = new Date(chip);
    return isNaN(d.getTime()) ? chip : d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }

  private normalizeMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toYearMonth(value?: string | Date | null): number | null {
    if (!value) return null;
    if (value instanceof Date) return value.getFullYear() * 12 + (value.getMonth() + 1);

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.getFullYear() * 12 + (parsed.getMonth() + 1);
    }

    const text = String(value).trim().toLowerCase();
    if (!text) return null;

    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','sept','oct','nov','dec'];
    const nameMatch = text.match(/([a-z]{3,})\s*[-/ ]\s*(\d{4})/);
    if (nameMatch) {
      const monthToken = nameMatch[1];
      const monthIndex = monthNames.findIndex(m => monthToken.startsWith(m));
      if (monthIndex >= 0) {
        const year = Number(nameMatch[2]);
        return year * 12 + (monthIndex + 1);
      }
    }

    const yearFirst = text.match(/(\d{4})\s*[-/ ]\s*(\d{1,2})/);
    if (yearFirst) {
      const year = Number(yearFirst[1]);
      const month = Number(yearFirst[2]);
      if (month >= 1 && month <= 12) return year * 12 + month;
    }

    const monthFirst = text.match(/(\d{1,2})\s*[-/ ]\s*(\d{4})/);
    if (monthFirst) {
      const month = Number(monthFirst[1]);
      const year = Number(monthFirst[2]);
      if (month >= 1 && month <= 12) return year * 12 + month;
    }

    return null;
  }

  onPage(event: { first: number; rows: number }): void {
    this.first = event.first;
    this.pageSize = event.rows;
    this.page = Math.floor(event.first / event.rows) + 1;
    this.expandedRowKeys = {};
    this.reload$.next();
  }

  onSort(event: SortEvent): void {
    const data = this.rows.slice();
    if (!event.field || !event.order) {
      this.rows = data;
      return;
    }

    this.rows = data.sort((a, b) => {
      const valueA = this.getSortValue(a, event.field || '');
      const valueB = this.getSortValue(b, event.field || '');

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
      return event.order === 1 ? cmp : -cmp;
    });
    this.expandedRowKeys = {};
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

  detailEntries(row: BudgetTrackerRow): { key: string; value: any; isLink: boolean }[] {
    return this.detailSections(row).flatMap(section =>
      this.objectEntries(section.data).map(item => ({
        key: item.key,
        value: item.value,
        isLink: this.isLink(item.key)
      }))
    );
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
