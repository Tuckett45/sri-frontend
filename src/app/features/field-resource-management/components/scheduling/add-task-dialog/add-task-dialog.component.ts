import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { JobType, Priority } from '../../../models/job.model';
import { Technician } from '../../../models/technician.model';
import { Crew } from '../../../models/crew.model';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectAllCrews } from '../../../state/crews/crew.selectors';
import * as JobActions from '../../../state/jobs/job.actions';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import * as CrewActions from '../../../state/crews/crew.actions';

export interface AddTaskDialogData {
  preselectedDate?: Date;
  preselectedTechnicianId?: string;
  preselectedCrewId?: string;
}

@Component({
  selector: 'app-add-task-dialog',
  templateUrl: './add-task-dialog.component.html',
  styleUrls: ['./add-task-dialog.component.scss']
})
export class AddTaskDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  taskForm: FormGroup;
  technicians$: Observable<Technician[]>;
  crews$: Observable<Crew[]>;
  technicians: Technician[] = [];
  crews: Crew[] = [];

  JobType = JobType;
  Priority = Priority;
  jobTypes = Object.values(JobType);
  priorities = Object.values(Priority);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AddTaskDialogData,
    private dialogRef: MatDialogRef<AddTaskDialogComponent>,
    private fb: FormBuilder,
    private store: Store
  ) {
    this.technicians$ = this.store.select(selectAllTechnicians);
    this.crews$ = this.store.select(selectAllCrews);

    const now = data?.preselectedDate || new Date();
    const endTime = new Date(now);
    endTime.setHours(endTime.getHours() + 2);

    this.taskForm = this.fb.group({
      client: ['', Validators.required],
      siteName: ['', Validators.required],
      jobType: [JobType.Install, Validators.required],
      priority: [Priority.Normal, Validators.required],
      scopeDescription: [''],
      estimatedLaborHours: [2, [Validators.required, Validators.min(0.5)]],
      scheduledStartDate: [this.formatDateTimeLocal(now), Validators.required],
      scheduledEndDate: [this.formatDateTimeLocal(endTime), Validators.required],
      requiredCrewSize: [1, [Validators.required, Validators.min(1)]],
      assignTo: ['none'],
      technicianId: [''],
      crewId: [''],
      siteStreet: [''],
      siteCity: [''],
      siteState: [''],
      siteZip: ['']
    });
  }

  ngOnInit(): void {
    this.technicians$.pipe(takeUntil(this.destroy$)).subscribe(t => this.technicians = t);
    this.crews$.pipe(takeUntil(this.destroy$)).subscribe(c => this.crews = c);

    if (this.data?.preselectedTechnicianId) {
      this.taskForm.patchValue({ assignTo: 'technician', technicianId: this.data.preselectedTechnicianId });
    } else if (this.data?.preselectedCrewId) {
      this.taskForm.patchValue({ assignTo: 'crew', crewId: this.data.preselectedCrewId });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (!this.taskForm.valid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const v = this.taskForm.value;
    const jobDto = {
      client: v.client,
      siteName: v.siteName,
      siteAddress: {
        street: v.siteStreet,
        city: v.siteCity,
        state: v.siteState,
        zipCode: v.siteZip
      },
      jobType: v.jobType,
      priority: v.priority,
      scopeDescription: v.scopeDescription || '',
      requiredSkills: [],
      requiredCrewSize: v.requiredCrewSize,
      estimatedLaborHours: v.estimatedLaborHours,
      scheduledStartDate: new Date(v.scheduledStartDate),
      scheduledEndDate: new Date(v.scheduledEndDate),
      authorizationStatus: 'pending' as const,
      hasPurchaseOrders: false,
      standardBillRate: 0,
      overtimeBillRate: 0,
      perDiem: 0,
      invoicingProcess: 'weekly' as const,
      projectDirector: '',
      targetResources: v.requiredCrewSize,
      bizDevContact: '',
      requestedHours: v.estimatedLaborHours,
      overtimeRequired: false
    };

    this.store.dispatch(JobActions.createJob({ job: jobDto }));

    this.dialogRef.close({
      created: true,
      assignTo: v.assignTo,
      technicianId: v.technicianId,
      crewId: v.crewId
    });
  }

  onCancel(): void {
    this.dialogRef.close({ created: false });
  }

  private formatDateTimeLocal(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
