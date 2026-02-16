import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { debounceTime } from 'rxjs/operators';
import { AuditLogEntry } from '../../../models/audit-log.model';
import { ExportService } from '../../../services/export.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-audit-log-viewer',
  templateUrl: './audit-log-viewer.component.html',
  styleUrls: ['./audit-log-viewer.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class AuditLogViewerComponent implements OnInit {
  displayedColumns: string[] = ['timestamp', 'user', 'actionType', 'entity', 'details', 'expand'];
  dataSource = new MatTableDataSource<AuditLogEntry>();
  filterForm: FormGroup;
  expandedElement: AuditLogEntry | null = null;

  actionTypes = [
    'CREATE',
    'UPDATE',
    'DELETE',
    'ASSIGN',
    'REASSIGN',
    'STATUS_CHANGE',
    'CLOCK_IN',
    'CLOCK_OUT'
  ];

  users: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private exportService: ExportService
  ) {
    this.filterForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      user: [''],
      actionType: ['']
    });
  }

  ngOnInit(): void {
    // Load audit logs from state
    // this.store.select(selectAuditLogs).subscribe(logs => {
    //   this.dataSource.data = logs;
    //   this.users = [...new Set(logs.map(log => log.user))];
    // });
    
    // Mock data for demonstration
    this.dataSource.data = [
      {
        id: '1',
        timestamp: new Date(),
        user: 'john.doe@example.com',
        actionType: 'CREATE',
        entity: 'Job',
        entityId: 'JOB-12345',
        details: {
          jobId: 'JOB-12345',
          client: 'Acme Corp',
          siteName: 'Main Office'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000),
        user: 'jane.smith@example.com',
        actionType: 'ASSIGN',
        entity: 'Assignment',
        entityId: 'ASSIGN-789',
        details: {
          jobId: 'JOB-12345',
          technicianId: 'TECH-456',
          technicianName: 'Mike Johnson'
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0...'
      }
    ];

    this.users = [...new Set(this.dataSource.data.map(log => log.user))];
    this.dataSource.paginator = this.paginator;

    // Apply filters on form changes
    this.filterForm.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.applyFilters());
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    
    this.dataSource.filterPredicate = (data: AuditLogEntry) => {
      // Date range filter
      if (filters.startDate && filters.endDate) {
        const logDate = new Date(data.timestamp);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        if (logDate < startDate || logDate > endDate) {
          return false;
        }
      }

      // User filter
      if (filters.user && data.user !== filters.user) {
        return false;
      }

      // Action type filter
      if (filters.actionType && data.actionType !== filters.actionType) {
        return false;
      }

      return true;
    };

    this.dataSource.filter = JSON.stringify(filters);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.dataSource.filter = '';
  }

  toggleRow(element: AuditLogEntry): void {
    this.expandedElement = this.expandedElement === element ? null : element;
  }

  onExportToCSV(): void {
    const headers = ['Timestamp', 'User', 'Action Type', 'Entity', 'Entity ID', 'IP Address'];
    const data = this.dataSource.filteredData.map(log => [
      this.exportService.formatDate(log.timestamp, 'YYYY-MM-DD HH:mm:ss'),
      log.user,
      log.actionType,
      log.entity,
      log.entityId,
      log.ipAddress || ''
    ]);

    this.exportService.generateCSV({
      filename: this.exportService.generateTimestampFilename('audit-log', 'csv'),
      headers,
      data
    });
  }

  getActionIcon(actionType: string): string {
    const iconMap: { [key: string]: string } = {
      'CREATE': 'add_circle',
      'UPDATE': 'edit',
      'DELETE': 'delete',
      'ASSIGN': 'assignment',
      'REASSIGN': 'swap_horiz',
      'STATUS_CHANGE': 'update',
      'CLOCK_IN': 'login',
      'CLOCK_OUT': 'logout'
    };
    return iconMap[actionType] || 'info';
  }

  getActionColor(actionType: string): string {
    const colorMap: { [key: string]: string } = {
      'CREATE': 'primary',
      'UPDATE': 'accent',
      'DELETE': 'warn',
      'ASSIGN': 'primary',
      'REASSIGN': 'accent',
      'STATUS_CHANGE': 'primary',
      'CLOCK_IN': 'primary',
      'CLOCK_OUT': 'accent'
    };
    return colorMap[actionType] || '';
  }
}
