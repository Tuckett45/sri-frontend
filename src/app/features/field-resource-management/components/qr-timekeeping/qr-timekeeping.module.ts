import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Routing
import { qrTimekeepingRoutes } from './qr-timekeeping-routing';

// Technician Components
import { QrScannerComponent } from './qr-scanner/qr-scanner.component';
import { TimeCategorySelectorComponent } from './time-category-selector/time-category-selector.component';
import { ScanFeedbackComponent } from './scan-feedback/scan-feedback.component';
import { QrTimeHistoryComponent } from './qr-time-history/qr-time-history.component';

// Admin Components
import { StationManagementComponent, StationRegistrationDialogComponent, StationDeactivateConfirmDialogComponent } from './station-management/station-management.component';
import { StationMapViewComponent } from './station-map-view/station-map-view.component';
import { AttendanceDashboardComponent } from './attendance-dashboard/attendance-dashboard.component';
import { ReconciliationViewComponent, ResolveDiscrepancyDialogComponent, EscalateDiscrepancyDialogComponent } from './reconciliation-view/reconciliation-view.component';
import { ReconciliationDetailComponent } from './reconciliation-detail/reconciliation-detail.component';

// Shared Components
import { TimeCategoryBadgeComponent } from './shared/time-category-badge.component';
import { ScanStatusIndicatorComponent } from './shared/scan-status-indicator.component';

/**
 * QR Timekeeping Module
 *
 * Lazy-loaded child module of FRM routing providing the complete
 * QR Code Timekeeping UI. Contains technician components for QR scanning
 * and clock-in/out, and admin components for station management,
 * attendance monitoring, and Celerity reconciliation.
 *
 * This module is loaded via:
 *   loadChildren: () => import('./components/qr-timekeeping/qr-timekeeping.module').then(m => m.QrTimekeepingModule)
 *
 * Requirements: 12.1, 12.2, 12.3, 15.1
 */
@NgModule({
  declarations: [
    // Technician Components
    QrScannerComponent,
    TimeCategorySelectorComponent,
    ScanFeedbackComponent,
    QrTimeHistoryComponent,
    // Admin Components
    StationManagementComponent,
    StationRegistrationDialogComponent,
    StationDeactivateConfirmDialogComponent,
    StationMapViewComponent,
    AttendanceDashboardComponent,
    ReconciliationViewComponent,
    ResolveDiscrepancyDialogComponent,
    EscalateDiscrepancyDialogComponent,
    ReconciliationDetailComponent,
    // Shared Components
    TimeCategoryBadgeComponent,
    ScanStatusIndicatorComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    LeafletModule,
    RouterModule.forChild(qrTimekeepingRoutes),
    StoreModule.forFeature('qrTimekeeping', {}),
    EffectsModule.forFeature([])
  ]
})
export class QrTimekeepingModule {}
