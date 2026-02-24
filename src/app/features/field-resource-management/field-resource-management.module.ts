import { NgModule, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

// Shared Material Module
import { SharedMaterialModule } from './shared-material.module';

// Routing
import { FieldResourceManagementRoutingModule } from './field-resource-management-routing.module';

// State Management - Reducers
import { technicianReducer } from './state/technicians/technician.reducer';
import { jobReducer } from './state/jobs/job.reducer';
import { assignmentReducer } from './state/assignments/assignment.reducer';
import { timeEntryReducer } from './state/time-entries/time-entry.reducer';
import { notificationReducer } from './state/notifications/notification.reducer';
import { uiReducer } from './state/ui/ui.reducer';
import { reportingReducer } from './state/reporting/reporting.reducer';

// State Management - Effects
import { TechnicianEffects } from './state/technicians/technician.effects';
import { JobEffects } from './state/jobs/job.effects';
import { AssignmentEffects } from './state/assignments/assignment.effects';
import { TimeEntryEffects } from './state/time-entries/time-entry.effects';
import { NotificationEffects } from './state/notifications/notification.effects';
import { ReportingEffects } from './state/reporting/reporting.effects';

// Meta-Reducers
import { storageSyncMetaReducer } from './state/meta-reducers/storage-sync.meta-reducer';

// Shared Components
import { SkillSelectorComponent } from './components/shared/skill-selector/skill-selector.component';
import { StatusBadgeComponent } from './components/shared/status-badge/status-badge.component';
import { FileUploadComponent } from './components/shared/file-upload/file-upload.component';
import { DateRangePickerComponent } from './components/shared/date-range-picker/date-range-picker.component';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from './components/shared/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from './components/shared/empty-state/empty-state.component';

// Technician Components
import { TechnicianListComponent } from './components/technicians/technician-list/technician-list.component';
import { TechnicianDetailComponent } from './components/technicians/technician-detail/technician-detail.component';
import { TechnicianFormComponent } from './components/technicians/technician-form/technician-form.component';

// Job Components
import { JobListComponent } from './components/jobs/job-list/job-list.component';
import { JobDetailComponent } from './components/jobs/job-detail/job-detail.component';
import { JobFormComponent } from './components/jobs/job-form/job-form.component';
import { JobNotesComponent } from './components/jobs/job-notes/job-notes.component';
import { JobStatusTimelineComponent } from './components/jobs/job-status-timeline/job-status-timeline.component';

// Scheduling Components
import { CalendarViewComponent } from './components/scheduling/calendar-view/calendar-view.component';
import { AssignmentDialogComponent } from './components/scheduling/assignment-dialog/assignment-dialog.component';
import { ConflictResolverComponent } from './components/scheduling/conflict-resolver/conflict-resolver.component';
import { TechnicianScheduleComponent } from './components/scheduling/technician-schedule/technician-schedule.component';

// Mobile Components
import { DailyViewComponent } from './components/mobile/daily-view/daily-view.component';
import { JobCardComponent } from './components/mobile/job-card/job-card.component';
import { TimeTrackerComponent } from './components/mobile/time-tracker/time-tracker.component';
import { JobCompletionFormComponent } from './components/mobile/job-completion-form/job-completion-form.component';

// Reporting Components
import { DashboardComponent } from './components/reporting/dashboard/dashboard.component';
import { UtilizationReportComponent } from './components/reporting/utilization-report/utilization-report.component';
import { JobPerformanceReportComponent } from './components/reporting/job-performance-report/job-performance-report.component';
import { KPICardComponent } from './components/reporting/kpi-card/kpi-card.component';
import { TimecardDashboardComponent } from './components/reporting/timecard-dashboard/timecard-dashboard.component';
import { CMDashboardComponent } from './components/reporting/cm-dashboard/cm-dashboard.component';
import { AdminDashboardComponent } from './components/reporting/admin-dashboard/admin-dashboard.component';

// Notification Components
import { NotificationPanelComponent } from './components/notifications/notification-panel/notification-panel.component';

// Admin Module
import { AdminModule } from './components/admin/admin.module';

// Shared Components (additional)
import { BatchOperationsToolbarComponent } from './components/shared/batch-operations-toolbar/batch-operations-toolbar.component';
import { BatchStatusDialogComponent } from './components/shared/batch-status-dialog/batch-status-dialog.component';
import { BatchTechnicianDialogComponent } from './components/shared/batch-technician-dialog/batch-technician-dialog.component';
import { FrmNavMenuComponent } from './components/shared/frm-nav-menu/frm-nav-menu.component';
import { BreadcrumbComponent } from './components/shared/breadcrumb/breadcrumb.component';
import { OfflineIndicatorComponent } from './components/shared/offline-indicator/offline-indicator.component';
import { StartTimeEntryModalComponent } from './components/shared/start-time-entry-modal/start-time-entry-modal.component';

// Services
import { FrmRealtimeIntegratorService } from './services/frm-realtime-integrator.service';
import { GlobalErrorHandlerService } from './services/global-error-handler.service';

// Interceptors
import { ErrorInterceptor } from './interceptors/error.interceptor';

// Pipes
import { HighlightPipe } from './pipes/highlight.pipe';

/**
 * Field Resource Management Feature Module
 * 
 * This module provides comprehensive field technician scheduling, job management,
 * and performance tracking capabilities for the ATLAS system.
 * 
 * Features:
 * - Technician profile management with skills and certifications
 * - Job and work order management
 * - Visual scheduling with drag-and-drop calendar
 * - Mobile-optimized daily view for field technicians
 * - Time and activity tracking with geolocation
 * - Real-time updates via SignalR
 * - Reporting and analytics (utilization, performance, KPIs)
 * - Progressive Web App (PWA) support for offline capability
 * 
 * Architecture:
 * - NgRx for state management (Store, Effects)
 * - Service layer for API communication and SignalR
 * - Component-based UI with Angular Material
 * - Lazy-loaded routing for optimal performance
 * - Mobile-first responsive design
 */
@NgModule({
  declarations: [
    // Pipes
    HighlightPipe,
    
    // Shared Components
    SkillSelectorComponent,
    StatusBadgeComponent,
    FileUploadComponent,
    DateRangePickerComponent,
    ConfirmDialogComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    BatchOperationsToolbarComponent,
    BatchStatusDialogComponent,
    BatchTechnicianDialogComponent,
    FrmNavMenuComponent,
    BreadcrumbComponent,
    OfflineIndicatorComponent,
    StartTimeEntryModalComponent,
    
    // Technician Components
    TechnicianListComponent,
    TechnicianDetailComponent,
    TechnicianFormComponent,
    
    // Job Components
    JobListComponent,
    JobDetailComponent,
    JobFormComponent,
    JobNotesComponent,
    JobStatusTimelineComponent,
    
    // Scheduling Components
    CalendarViewComponent,
    AssignmentDialogComponent,
    ConflictResolverComponent,
    TechnicianScheduleComponent,
    
    // Mobile Components
    DailyViewComponent,
    JobCardComponent,
    TimeTrackerComponent,
    JobCompletionFormComponent,
    
    // Reporting Components
    DashboardComponent,
    UtilizationReportComponent,
    JobPerformanceReportComponent,
    KPICardComponent,
    TimecardDashboardComponent,
    CMDashboardComponent,
    AdminDashboardComponent,
    
    // Notification Components
    NotificationPanelComponent
    
    // Admin components are now in AdminModule
  ],
  imports: [
    // Angular Core
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    
    // Routing
    FieldResourceManagementRoutingModule,
    
    // Shared Material Module
    SharedMaterialModule,
    
    // Admin Module
    AdminModule,
    
    // NgRx State Management
    StoreModule.forFeature('technicians', technicianReducer),
    StoreModule.forFeature('jobs', jobReducer),
    StoreModule.forFeature('assignments', assignmentReducer),
    StoreModule.forFeature('timeEntries', timeEntryReducer, {
      metaReducers: [storageSyncMetaReducer]
    }),
    StoreModule.forFeature('notifications', notificationReducer),
    StoreModule.forFeature('ui', uiReducer),
    StoreModule.forFeature('reporting', reportingReducer),
    
    // NgRx Effects
    EffectsModule.forFeature([
      TechnicianEffects,
      JobEffects,
      AssignmentEffects,
      TimeEntryEffects,
      NotificationEffects,
      ReportingEffects
    ])
  ],
  providers: [
    // Error handling
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  exports: [
    TimecardDashboardComponent
  ]
})
export class FieldResourceManagementModule {
  constructor(private realtimeIntegrator: FrmRealtimeIntegratorService) {
    // Initialize SignalR real-time updates on module load
    this.realtimeIntegrator.initialize().catch(error => {
      console.error('Failed to initialize FRM real-time updates:', error);
      // Application continues to function without real-time updates
    });
  }
}
