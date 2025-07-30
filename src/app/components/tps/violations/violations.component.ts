import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
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

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadViolations();
  }

  loadViolations() {
    this.tpsService.getViolations().subscribe(res => this.dataSource.data = res);
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
