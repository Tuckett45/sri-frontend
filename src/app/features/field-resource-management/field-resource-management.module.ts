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
import { crewReducer } from './state/crews/crew.reducer';
import { assignmentReducer } from './state/assignments/assignment.reducer';
import { timeEntryReducer } from './state/time-entries/time-entry.reducer';
import { notificationReducer } from './state/notifications/notification.reducer';
import { uiReducer } from './state/ui/ui.reducer';
import { reportingReducer } from './state/reporting/reporting.reducer';
import { timecardReducer } from './state/timecards/timecard.reducer';
import { budgetReducer } from './state/budgets/budget.reducer';
import { travelReducer } from './state/travel/travel.reducer';
import { inventoryReducer } from './state/inventory/inventory.reducer';
import { materialsReducer } from './state/materials/materials.reducer';

// State Management - Effects
import { TechnicianEffects } from './state/technicians/technician.effects';
import { JobEffects } from './state/jobs/job.effects';
import { CrewEffects } from './state/crews/crew.effects';
import { AssignmentEffects } from './state/assignments/assignment.effects';
import { TimeEntryEffects } from './state/time-entries/time-entry.effects';
import { NotificationEffects } from './state/notifications/notification.effects';
import { ReportingEffects } from './state/reporting/reporting.effects';
import { TimecardEffects } from './state/timecards/timecard.effects';
import { BudgetEffects } from './state/budgets/budget.effects';
import { TravelEffects } from './state/travel/travel.effects';
import { InventoryEffects } from './state/inventory/inventory.effects';
import { MaterialsEffects } from './state/materials/materials.effects';

// Meta-Reducers
import { storageSyncMetaReducer } from './state/meta-reducers/storage-sync.meta-reducer';

// Shared Components Module
import { SharedComponentsModule } from './components/shared/shared-components.module';

// Layout Components (needed for FRM layout wrapper)
import { FrmLayoutComponent } from './components/layout/frm-layout/frm-layout.component';
import { NavigationMenuComponent } from './components/layout/navigation-menu/navigation-menu.component';
import { OfflineIndicatorComponent } from './components/layout/offline-indicator/offline-indicator.component';
import { BreadcrumbComponent } from './components/layout/breadcrumb/breadcrumb.component';

// Home Dashboard Component (eagerly loaded as landing page)
import { HomeDashboardComponent } from './components/home/home-dashboard.component';

// Widget Components
import { QuickActionsWidgetComponent } from './components/home/widgets/quick-actions-widget/quick-actions-widget.component';
import { ActiveJobsWidgetComponent } from './components/home/widgets/active-jobs-widget/active-jobs-widget.component';
import { RecentJobsWidgetComponent } from './components/home/widgets/recent-jobs-widget/recent-jobs-widget.component';
import { AssignmentsWidgetComponent } from './components/home/widgets/assignments-widget/assignments-widget.component';
import { TimecardWidgetComponent } from './components/home/widgets/timecard-widget/timecard-widget.component';
import { ScheduleWidgetComponent } from './components/home/widgets/schedule-widget/schedule-widget.component';
import { CurrentJobStatusWidgetComponent } from './components/home/widgets/current-job-status-widget/current-job-status-widget.component';
import { AvailableTechniciansWidgetComponent } from './components/home/widgets/available-technicians-widget/available-technicians-widget.component';
import { KpiSummaryCardComponent } from './components/home/widgets/kpi-summary-card/kpi-summary-card.component';
import { ApprovalsWidgetComponent } from './components/home/widgets/approvals-widget/approvals-widget.component';
import { TimecardReviewWidgetComponent } from './components/home/widgets/timecard-review-widget/timecard-review-widget.component';
import { ExpensesWidgetComponent } from './components/home/widgets/expenses-widget/expenses-widget.component';
import { TravelBreakPtoWidgetComponent } from './components/home/widgets/travel-break-pto-widget/travel-break-pto-widget.component';

// Role-Specific Dashboard Components
import { TechnicianDashboardComponent } from './components/home/dashboards/technician-dashboard/technician-dashboard.component';
import { AdminDashboardComponent } from './components/home/dashboards/admin-dashboard/admin-dashboard.component';
import { CmDashboardComponent } from './components/home/dashboards/cm-dashboard/cm-dashboard.component';
import { HrPayrollDashboardComponent } from './components/home/dashboards/hr-payroll-dashboard/hr-payroll-dashboard.component';
import { DefaultDashboardComponent } from './components/home/dashboards/default-dashboard/default-dashboard.component';

// Notification Components (needed for real-time updates)
import { NotificationPanelComponent } from './components/notifications/notification-panel/notification-panel.component';

// Directives
import { FrmHasPermissionDirective } from './directives/frm-has-permission.directive';

// Services
import { FrmRealtimeIntegratorService } from './services/frm-realtime-integrator.service';
import { GlobalErrorHandlerService } from './services/global-error-handler.service';
import { MockDataService } from './services/mock-data.service';

// Interceptors
import { ErrorInterceptor } from './interceptors/error.interceptor';

/**
 * Field Resource Management Feature Module
 * 
 * This module provides comprehensive field technician scheduling, job management,
 * and performance tracking capabilities for the ATLAS system.
 * 
 * Features:
 * - Technician profile management with skills and certifications (lazy-loaded)
 * - Job and work order management (lazy-loaded)
 * - Crew management (lazy-loaded)
 * - Visual scheduling with drag-and-drop calendar (lazy-loaded)
 * - Mobile-optimized daily view for field technicians (lazy-loaded)
 * - Geographic mapping with real-time location tracking (lazy-loaded)
 * - Time and activity tracking with geolocation
 * - Real-time updates via SignalR
 * - Reporting and analytics (lazy-loaded)
 * - Admin configuration and management (lazy-loaded)
 * - Progressive Web App (PWA) support for offline capability
 * 
 * Architecture:
 * - NgRx for state management (Store, Effects)
 * - Service layer for API communication and SignalR
 * - Component-based UI with Angular Material
 * - Lazy-loaded feature modules for optimal performance
 * - Mobile-first responsive design
 * 
 * Performance Optimization:
 * - All feature areas (technicians, jobs, crews, scheduling, mobile, reporting, admin, mapping)
 *   are lazy-loaded using loadChildren in routing configuration
 * - Only core layout and shared components are eagerly loaded
 * - Dashboard components are in the ReportingModule (lazy-loaded)
 * - Reduces initial bundle size and improves load times
 * 
 * Requirements: 4.1.6 (Lazy loading for feature modules)
 */
@NgModule({
  declarations: [
    // Layout Components
    FrmLayoutComponent,
    NavigationMenuComponent,
    OfflineIndicatorComponent,
    BreadcrumbComponent,
    
    // Home Dashboard (landing page)
    HomeDashboardComponent,

    // Widget Components
    QuickActionsWidgetComponent,
    ActiveJobsWidgetComponent,
    RecentJobsWidgetComponent,
    AssignmentsWidgetComponent,
    TimecardWidgetComponent,
    ScheduleWidgetComponent,
    CurrentJobStatusWidgetComponent,
    AvailableTechniciansWidgetComponent,
    KpiSummaryCardComponent,
    ApprovalsWidgetComponent,
    TimecardReviewWidgetComponent,
    ExpensesWidgetComponent,
    TravelBreakPtoWidgetComponent,

    // Role-Specific Dashboard Components
    TechnicianDashboardComponent,
    AdminDashboardComponent,
    CmDashboardComponent,
    HrPayrollDashboardComponent,
    DefaultDashboardComponent,
    
    // Notification Components
    NotificationPanelComponent,

    // Directives
    FrmHasPermissionDirective
    
    // Note: All feature components (technicians, jobs, crews, scheduling, mobile, admin, mapping)
    // and analytics dashboard are now in their respective lazy-loaded feature modules
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
    
    // Shared Components Module
    SharedComponentsModule,
    
    // NgRx State Management
    StoreModule.forFeature('technicians', technicianReducer),
    StoreModule.forFeature('jobs', jobReducer),
    StoreModule.forFeature('crews', crewReducer),
    StoreModule.forFeature('assignments', assignmentReducer),
    StoreModule.forFeature('timeEntries', timeEntryReducer, {
      metaReducers: [storageSyncMetaReducer]
    }),
    StoreModule.forFeature('notifications', notificationReducer),
    StoreModule.forFeature('ui', uiReducer),
    StoreModule.forFeature('reporting', reportingReducer),
    StoreModule.forFeature('timecards', timecardReducer),
    StoreModule.forFeature('budgets', budgetReducer),
    StoreModule.forFeature('travel', travelReducer),
    StoreModule.forFeature('inventory', inventoryReducer),
    StoreModule.forFeature('materials', materialsReducer),
    
    // NgRx Effects
    EffectsModule.forFeature([
      TechnicianEffects,
      JobEffects,
      CrewEffects,
      AssignmentEffects,
      TimeEntryEffects,
      NotificationEffects,
      ReportingEffects,
      TimecardEffects,
      BudgetEffects,
      TravelEffects,
      InventoryEffects,
      MaterialsEffects
    ])
  ],
  providers: [
    // Error handling
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ]
})
export class FieldResourceManagementModule {
  constructor(
    private realtimeIntegrator: FrmRealtimeIntegratorService,
    private mockDataService: MockDataService
  ) {
    // Initialize SignalR real-time updates on module load
    this.realtimeIntegrator.initialize().catch(error => {
      console.error('Failed to initialize FRM real-time updates:', error);
      // Application continues to function without real-time updates
    });

    // Initialize mock data for demo
    // TODO: Remove this in production or add environment check
    setTimeout(() => {
      this.mockDataService.initializeAllMockData();
    }, 1000); // Delay to ensure store is ready
  }
}
