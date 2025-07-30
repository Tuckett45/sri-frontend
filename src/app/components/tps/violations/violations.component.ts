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
  displayedColumns: string[] = ['workPackage', 'city', 'violation', 'date'];
  dataSource = new MatTableDataSource<WPViolation>();

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadViolations();
  }

  loadViolations() {
    this.tpsService.getViolations().subscribe(res => this.dataSource.data = res);
  }

  exportCsv() {
    const rows = this.dataSource.data.map(v =>
      [v.workPackage, v.city, v.violation, v.date].join(',')
    );
    const csv = ['Work Package,City,Violation,Date', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'violations.csv';
    a.click();
  }
}
