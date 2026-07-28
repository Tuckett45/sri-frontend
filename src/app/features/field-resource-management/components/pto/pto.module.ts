import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

// PTO State
import { ptoReducer } from '../../state/pto/pto.reducer';
import { PtoEffects } from '../../state/pto/pto.effects';
import { PtoNotificationEffects } from '../../state/pto/pto-notification.effects';

// Overtime State
import { overtimeReducer } from '../../state/overtime/overtime.reducer';
import { OvertimeEffects } from '../../state/overtime/overtime.effects';
import { OvertimeNotificationEffects } from '../../state/overtime/overtime-notification.effects';

// Guards
import { ManagerGuard } from '../../guards/manager.guard';
import { PayrollGuard } from '../../guards/payroll.guard';

// PTO Components
import { PtoRequestFormComponent } from './pto-request-form/pto-request-form.component';
import { PtoRequestListComponent } from './pto-request-list/pto-request-list.component';
import { PtoRequestDetailComponent } from './pto-request-detail/pto-request-detail.component';
import { PtoManagerQueueComponent } from './pto-manager-queue/pto-manager-queue.component';
import { PtoBackofficeQueueComponent } from './pto-backoffice-queue/pto-backoffice-queue.component';
import { PtoLeaveTypeChipComponent } from './pto-leave-type-chip/pto-leave-type-chip.component';

// Layout & Navigation Components
import { PtoLayoutComponent } from './pto-layout/pto-layout.component';
import { PtoSubNavComponent } from './pto-sub-nav/pto-sub-nav.component';

// Overtime Components
import { OvertimeRequestFormComponent } from './overtime-request-form/overtime-request-form.component';
import { OvertimeRequestListComponent } from './overtime-request-list/overtime-request-list.component';

// Manager/Approval Components
import { ApprovalDashboardComponent } from './approval-dashboard/approval-dashboard.component';

// Timeline Component
import { TeamTimelineComponent } from './team-timeline/team-timeline.component';

// Reports Component
import { PtoReportsComponent } from './reports/pto-reports.component';

const routes: Routes = [
  {
    path: '',
    component: PtoLayoutComponent,
    children: [
      // PTO Request List (default)
      {
        path: '',
        component: PtoRequestListComponent
      },
      // New PTO Request
      {
        path: 'new',
        component: PtoRequestFormComponent
      },
      // Team Timeline / Calendar View
      {
        path: 'timeline',
        component: TeamTimelineComponent
      },
      // Approval Dashboard (Manager/Backoffice combined view)
      {
        path: 'approvals',
        component: ApprovalDashboardComponent,
        canActivate: [ManagerGuard]
      },
      // Legacy Manager Queue (still accessible)
      {
        path: 'approvals/manager',
        component: PtoManagerQueueComponent,
        canActivate: [ManagerGuard]
      },
      // Legacy Backoffice Queue (still accessible)
      {
        path: 'approvals/backoffice',
        component: PtoBackofficeQueueComponent,
        canActivate: [PayrollGuard]
      },
      // Overtime Request List
      {
        path: 'overtime',
        component: OvertimeRequestListComponent
      },
      // New Overtime Request
      {
        path: 'overtime/new',
        component: OvertimeRequestFormComponent
      },
      // Reports (Manager/Payroll only)
      {
        path: 'reports',
        component: PtoReportsComponent,
        canActivate: [ManagerGuard]
      },
      // PTO Request Detail
      {
        path: ':id',
        component: PtoRequestDetailComponent
      }
    ]
  }
];

@NgModule({
  declarations: [
    // Layout & Navigation
    PtoLayoutComponent,
    PtoSubNavComponent,
    // PTO Components
    PtoRequestFormComponent,
    PtoRequestListComponent,
    PtoRequestDetailComponent,
    PtoManagerQueueComponent,
    PtoBackofficeQueueComponent,
    PtoLeaveTypeChipComponent,
    // Overtime Components
    OvertimeRequestFormComponent,
    OvertimeRequestListComponent,
    // Approval & Timeline Components
    ApprovalDashboardComponent,
    TeamTimelineComponent,
    // Reports Component
    PtoReportsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    StoreModule.forFeature('pto', ptoReducer),
    StoreModule.forFeature('overtime', overtimeReducer),
    EffectsModule.forFeature([PtoEffects, PtoNotificationEffects, OvertimeEffects, OvertimeNotificationEffects])
  ]
})
export class PtoModule { }
