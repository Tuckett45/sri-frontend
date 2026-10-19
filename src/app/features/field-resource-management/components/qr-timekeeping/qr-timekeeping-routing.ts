import { Routes } from '@angular/router';

// Guards
import { AdminGuard } from '../../guards/admin.guard';
import { TechnicianGuard } from '../../guards/technician.guard';

// Technician Components
import { QrScannerComponent } from './qr-scanner/qr-scanner.component';
import { QrTimeHistoryComponent } from './qr-time-history/qr-time-history.component';

// Admin Components
import { StationManagementComponent } from './station-management/station-management.component';
import { StationMapViewComponent } from './station-map-view/station-map-view.component';
import { AttendanceDashboardComponent } from './attendance-dashboard/attendance-dashboard.component';
import { ReconciliationViewComponent } from './reconciliation-view/reconciliation-view.component';
import { ReconciliationDetailComponent } from './reconciliation-detail/reconciliation-detail.component';

/**
 * QR Timekeeping Routes
 *
 * Defines child routes for the QR Timekeeping lazy-loaded module.
 * Technician routes (scan, history) are guarded by TechnicianGuard.
 * Admin routes (stations, attendance, reconciliation) are guarded by AdminGuard.
 *
 * Requirements: 12.1, 12.2, 12.3, 15.1
 */
export const qrTimekeepingRoutes: Routes = [
  {
    path: '',
    redirectTo: 'scan',
    pathMatch: 'full'
  },
  // Technician routes
  {
    path: 'scan',
    component: QrScannerComponent,
    canActivate: [TechnicianGuard],
    data: { title: 'QR Clock In/Out', breadcrumb: 'QR Scan' }
  },
  {
    path: 'history',
    component: QrTimeHistoryComponent,
    canActivate: [TechnicianGuard],
    data: { title: 'QR Time History', breadcrumb: 'History' }
  },
  // Admin routes
  {
    path: 'stations',
    component: StationManagementComponent,
    canActivate: [AdminGuard],
    data: { title: 'QR Station Management', breadcrumb: 'Stations' }
  },
  {
    path: 'stations/map/:jobId',
    component: StationMapViewComponent,
    canActivate: [AdminGuard],
    data: { title: 'Station Map', breadcrumb: 'Station Map' }
  },
  {
    path: 'attendance',
    component: AttendanceDashboardComponent,
    canActivate: [AdminGuard],
    data: { title: 'Attendance Dashboard', breadcrumb: 'Attendance' }
  },
  {
    path: 'reconciliation',
    component: ReconciliationViewComponent,
    canActivate: [AdminGuard],
    data: { title: 'Celerity Reconciliation', breadcrumb: 'Reconciliation' }
  },
  {
    path: 'reconciliation/:reportId',
    component: ReconciliationDetailComponent,
    canActivate: [AdminGuard],
    data: { title: 'Reconciliation Report', breadcrumb: 'Report Detail' }
  }
];
