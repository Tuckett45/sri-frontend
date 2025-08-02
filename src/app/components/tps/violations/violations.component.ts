import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder } from '@angular/forms';
import { TpsService } from 'src/app/services/tps.service';
import { WPViolation } from 'src/app/models/wp-violation.model';

@Component({
  selector: 'app-violations',
  templateUrl: './violations.component.html',
  styleUrls: ['./violations.component.scss']
})
export class ViolationsComponent implements OnInit {
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

  filterForm = this.fb.group({
    startDate: [null],
    endDate: [null],
    vendor: ['']
  });

  constructor(private tpsService: TpsService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadViolations();
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  loadViolations() {
    this.tpsService.getViolations().subscribe(res => {
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
        v.overspentBy
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'violations.csv';
    a.click();
  }
}
