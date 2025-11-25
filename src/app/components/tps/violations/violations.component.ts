import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder } from '@angular/forms';
import { TpsService } from 'src/app/services/tps.service';
import { WPViolation } from 'src/app/models/wp-violation.model';
import { MatSort } from '@angular/material/sort';
import { Subject, takeUntil } from 'rxjs';

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
    
    // Load violations for initial city
    this.loadViolations();
    
    // Subscribe to city changes
    this.tpsService.selectedCity$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadViolations();
      });
    
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadViolations() {
    const city = this.tpsService.selectedCity.name;
    this.tpsService.getViolations(city).subscribe(res => {
      this.violations = res;
      this.applyFilters();
    });
  }

  applyFilters() {
    const { startDate, endDate, vendor } = this.filterForm.value;
    this.filteredViolations = this.violations.filter(v => {
      const date = v.monthYear ? new Date(v.monthYear) : null;
      const matchesStart = startDate ? (date ? date >= startDate : false) : true;
      const matchesEnd = endDate ? (date ? date <= endDate : false) : true;
      const matchesVendor = vendor ? v.vendor?.toLowerCase().includes(vendor.toLowerCase()) : true;
      return matchesStart && matchesEnd && matchesVendor;
    });
    this.dataSource.data = this.filteredViolations;
    this.dataSource.sort = this.sort;
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
