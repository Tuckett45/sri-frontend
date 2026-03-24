import { Component, OnInit } from '@angular/core';
import { IncidentReport } from '../../../models/payroll.models';

@Component({
  selector: 'app-incident-reports',
  template: `
    <div class="incident-reports">
      <h2>Incident Reports</h2>
      <div class="report-filters">
        <select [(ngModel)]="filterType" (ngModelChange)="applyFilter()">
          <option value="">All Types</option>
          <option value="auto_accident">Auto Accident</option>
          <option value="work_injury">Work Injury</option>
          <option value="other">Other</option>
        </select>
      </div>
      <table *ngIf="filteredReports.length > 0">
        <thead>
          <tr>
            <th>Type</th>
            <th>Employee ID</th>
            <th>Reported By</th>
            <th>Reported At</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let report of filteredReports">
            <td>{{ report.type }}</td>
            <td>{{ report.employeeId }}</td>
            <td>{{ report.reportedBy }}</td>
            <td>{{ report.reportedAt | date:'short' }}</td>
            <td>{{ report.description }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="filteredReports.length === 0">No incident reports found.</p>
    </div>
  `
})
export class IncidentReportsComponent implements OnInit {
  reports: IncidentReport[] = [];
  filteredReports: IncidentReport[] = [];
  filterType: string = '';

  ngOnInit(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.filterType) {
      this.filteredReports = this.reports.filter(r => r.type === this.filterType);
    } else {
      this.filteredReports = [...this.reports];
    }
  }
}
