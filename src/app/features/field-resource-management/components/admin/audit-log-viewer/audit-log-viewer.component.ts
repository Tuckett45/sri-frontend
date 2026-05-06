import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-audit-log-viewer',
  templateUrl: './audit-log-viewer.component.html',
  styleUrls: ['./audit-log-viewer.component.scss']
})
export class AuditLogViewerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  logs: any[] = [];
  filteredLogs: any[] = [];
  displayedColumns = ['timestamp', 'user', 'action', 'entity', 'details'];
  filterForm!: FormGroup;

  actionOptions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'VIEW'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      dateFrom: [null],
      dateTo: [null],
      user: [''],
      action: ['']
    });
    this.filteredLogs = [...this.logs];
  }

  applyFilters(): void {
    const { dateFrom, dateTo, user, action } = this.filterForm.value;
    this.filteredLogs = this.logs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (dateFrom && logDate < new Date(dateFrom)) return false;
      if (dateTo && logDate > new Date(dateTo)) return false;
      if (user && !log.user.toLowerCase().includes(user.toLowerCase())) return false;
      if (action && log.action !== action) return false;
      return true;
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.filteredLogs = [...this.logs];
  }

  exportLogs(): void {
    console.log('Exporting logs...');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
