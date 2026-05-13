import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Travel Shared Module for distance display in assignment dialog (no routes)
import { TravelSharedModule } from '../travel/travel.module';

// Scheduling Components
import { CalendarViewComponent } from './calendar-view/calendar-view.component';
import { AssignmentDialogComponent } from './assignment-dialog/assignment-dialog.component';
import { AddTaskDialogComponent } from './add-task-dialog/add-task-dialog.component';
import { EditJobDialogComponent } from './edit-job-dialog/edit-job-dialog.component';
import { ReassignDialogComponent } from './reassign-dialog/reassign-dialog.component';
import { ConflictResolverComponent } from './conflict-resolver/conflict-resolver.component';
import { TechnicianScheduleComponent } from './technician-schedule/technician-schedule.component';

const routes: Routes = [
  {
    path: '',
    component: CalendarViewComponent,
    data: { 
      title: 'Schedule',
      breadcrumb: 'Schedule'
    }
  },
  {
    path: 'conflicts',
    component: ConflictResolverComponent,
    data: { 
      title: 'Resolve Conflicts',
      breadcrumb: 'Conflicts'
    }
  },
  {
    path: 'technician/:id',
    component: TechnicianScheduleComponent,
    data: { 
      title: 'Technician Schedule',
      breadcrumb: 'Technician Schedule'
    }
  }
];

/**
 * Scheduling Feature Module
 * 
 * Lazy-loaded module for scheduling and assignment functionality.
 * Includes calendar view, assignment dialogs, conflict resolution,
 * and technician schedule views.
 */
@NgModule({
  declarations: [
    CalendarViewComponent,
    AssignmentDialogComponent,
    AddTaskDialogComponent,
    EditJobDialogComponent,
    ReassignDialogComponent,
    ConflictResolverComponent,
    TechnicianScheduleComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    TravelSharedModule,
    RouterModule.forChild(routes)
  ]
})
export class SchedulingModule { }
