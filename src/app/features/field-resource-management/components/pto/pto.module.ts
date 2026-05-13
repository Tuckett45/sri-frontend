import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

// State
import { ptoReducer } from '../../state/pto/pto.reducer';
import { PtoEffects } from '../../state/pto/pto.effects';
import { PtoNotificationEffects } from '../../state/pto/pto-notification.effects';

// Guards
import { ManagerGuard } from '../../guards/manager.guard';
import { PayrollGuard } from '../../guards/payroll.guard';

// Components
import { PtoRequestFormComponent } from './pto-request-form/pto-request-form.component';
import { PtoRequestListComponent } from './pto-request-list/pto-request-list.component';
import { PtoRequestDetailComponent } from './pto-request-detail/pto-request-detail.component';
import { PtoManagerQueueComponent } from './pto-manager-queue/pto-manager-queue.component';
import { PtoBackofficeQueueComponent } from './pto-backoffice-queue/pto-backoffice-queue.component';
import { PtoLeaveTypeChipComponent } from './pto-leave-type-chip/pto-leave-type-chip.component';

const routes: Routes = [
  {
    path: '',
    component: PtoRequestListComponent
  },
  {
    path: 'new',
    component: PtoRequestFormComponent
  },
  {
    path: 'approvals/manager',
    component: PtoManagerQueueComponent,
    canActivate: [ManagerGuard]
  },
  {
    path: 'approvals/backoffice',
    component: PtoBackofficeQueueComponent,
    canActivate: [PayrollGuard]
  },
  {
    path: ':id',
    component: PtoRequestDetailComponent
  }
];

@NgModule({
  declarations: [
    PtoRequestFormComponent,
    PtoRequestListComponent,
    PtoRequestDetailComponent,
    PtoManagerQueueComponent,
    PtoBackofficeQueueComponent,
    PtoLeaveTypeChipComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    StoreModule.forFeature('pto', ptoReducer),
    EffectsModule.forFeature([PtoEffects, PtoNotificationEffects])
  ]
})
export class PtoModule { }
