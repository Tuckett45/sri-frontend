import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder } from '@angular/forms';
import { TpsService, MarketOption, CityOption } from 'src/app/services/tps.service';
import { WPViolation } from 'src/app/models/wp-violation.model';
import { MatSort } from '@angular/material/sort';
import { Subject, combineLatest, takeUntil } from 'rxjs';

@Component({
  selector: 'app-violations',
  templateUrl: './violations.component.html',
  styleUrls: ['./violations.component.scss']
})
export class ViolationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  displayedColumns: string[] = [
    'monthYear',
    'vendor',
    'segment',
    'conlogPlannedAmount',
    'contingency',
    'planWithContingency',
    'atCompleteCost',
    'actualCost',
    'overspentBy'
  ];
  dataSource = new MatTableDataSource<WPViolation>();

  violations: WPViolation[] = [];
  filteredViolations: WPViolation[] = [];
  @ViewChild(MatSort) sort!: MatSort;

  filterForm = this.fb.group({
    startDate: [null as Date | null],
    endDate: [null as Date | null],
    vendor: ['']
  });

  constructor(private tpsService: TpsService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item: WPViolation, property: string) => {
      if (property === 'overspentBy') {
        return this.calculateOverspent(item);
      }
      return (item as any)[property];
    };
    
    combineLatest([this.tpsService.selectedMarket$, this.tpsService.selectedCity$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([market, city]) => this.loadViolations(market, city));
    
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  refresh(): void {
    this.loadViolations(this.tpsService.selectedMarket, this.tpsService.selectedCity);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadViolations(market: MarketOption, city: CityOption) {
    const filters: any = { market: market.code };
    if (city && !city.isAll) {
      filters.segmentPrefix = city.segmentPrefix;
      filters.metro = city.name;
    }
    this.tpsService.getViolations(filters).subscribe(res => {
      this.violations = res;
      this.applyFilters();
    });
  }

  applyFilters() {
    const { startDate, endDate, vendor } = this.filterForm.value;
    const startYm = this.toYearMonth(startDate ?? null);
    const endYm = this.toYearMonth(endDate ?? null);
    this.filteredViolations = this.violations.filter(v => {
      const rowYm = this.toYearMonth(v.monthYear ?? null);
      const matchesStart = startYm != null ? (rowYm != null ? rowYm >= startYm : false) : true;
      const matchesEnd = endYm != null ? (rowYm != null ? rowYm <= endYm : false) : true;
      const matchesVendor = vendor ? v.vendor?.toLowerCase().includes(vendor.toLowerCase()) : true;
      return matchesStart && matchesEnd && matchesVendor;
    });
    this.dataSource.data = this.filteredViolations;
    this.dataSource.sort = this.sort;
  }

  setStartMonth(date: Date, picker: any): void {
    this.filterForm.patchValue({ startDate: this.normalizeMonth(date) }, { emitEvent: true });
    picker.close();
  }

  setEndMonth(date: Date, picker: any): void {
    this.filterForm.patchValue({ endDate: this.normalizeMonth(date) }, { emitEvent: true });
    picker.close();
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

  exportCsv() {
    const headers = [
      'MonthYear',
      'Vendor',
      'Segment',
      'ConlogPlannedAmount',
      'Contingency',
      'PlanWithContingency',
      'AtCompleteCost',
      'ActualCost',
      'OverspentBy'
    ];
    const rows = this.dataSource.data.map(v =>
      [
        v.id,
        v.monthYear,
        v.vendor,
        v.segment,
        v.conlogPlannedAmount,
        v.contingency,
        v.planWithContingency,
        v.atCompleteCost,
        v.actualCost,
        this.calculateOverspent(v)
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'violations.csv';
    a.click();
  }

  calculateOverspent(v: WPViolation): number {
    const plan = v.planWithContingency ?? 0;
    const cost = v.actualCost ?? 0;
    return Math.max(0, cost - plan);
  }

  calculateOverspentPercent(v: WPViolation): number {
    const plan = v.planWithContingency ?? 0;
    const cost = v.actualCost ?? 0;
    const percentage = plan ? (cost - plan) / plan : 0;
    return Math.max(0, percentage);
  }
}
