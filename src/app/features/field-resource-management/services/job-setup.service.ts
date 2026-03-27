import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { debounceTime, take } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { JobSetupFormValue, JobSetupDraft } from '../models/job-setup.models';
import { CreateJobDto } from '../models/dtos/job.dto';
import { Job, JobType, Priority } from '../models/job.model';
import { AuthService } from '../../../services/auth.service';
import * as JobActions from '../state/jobs/job.actions';

/**
 * Service for managing the Job Setup Workflow.
 * Handles draft persistence to sessionStorage with debounced saves.
 */
@Injectable({ providedIn: 'root' })
export class JobSetupService {
  private readonly DRAFT_KEY = 'frm_job_setup_draft';
  private readonly DEBOUNCE_MS = 2000;

  private draftSave$ = new Subject<JobSetupDraft>();

  constructor(
    private authService: AuthService,
    private store: Store,
    private actions$: Actions,
  ) {
    this.draftSave$
      .pipe(debounceTime(this.DEBOUNCE_MS))
      .subscribe((draft) => this.writeDraft(draft));
  }

  /**
   * Queues a draft save with 2-second debounce.
   * @param formValue Current form state
   * @param currentStep Active step index
   */
  saveDraft(formValue: JobSetupFormValue, currentStep: number): void {
    const draft: JobSetupDraft = {
      formValue,
      currentStep,
      savedAt: new Date().toISOString(),
    };
    this.draftSave$.next(draft);
  }

  /**
   * Restores a previously saved draft from sessionStorage.
   * @returns The saved draft data or null if none exists / parse fails
   */
  restoreDraft(): { formValue: JobSetupFormValue; currentStep: number } | null {
    try {
      const raw = sessionStorage.getItem(this.DRAFT_KEY);
      if (!raw) {
        return null;
      }
      const draft: JobSetupDraft = JSON.parse(raw);
      return { formValue: draft.formValue, currentStep: draft.currentStep };
    } catch (e) {
      console.warn('JobSetupService: failed to restore draft', e);
      return null;
    }
  }

  /**
   * Removes the saved draft from sessionStorage.
   */
  clearDraft(): void {
    try {
      sessionStorage.removeItem(this.DRAFT_KEY);
    } catch (e) {
      console.warn('JobSetupService: failed to clear draft', e);
    }
  }

  /**
   * Maps a completed JobSetupFormValue to a CreateJobDto for API submission.
   * Sets status to NotStarted and createdBy to the authenticated user.
   */
  mapToCreateJobDto(formValue: JobSetupFormValue): CreateJobDto {
    const user = this.authService.getUser();
    const { customerInfo, pricingBilling, sriInternal } = formValue;

    return {
      client: customerInfo.clientName,
      siteName: customerInfo.siteName,
      siteAddress: {
        street: customerInfo.street,
        city: customerInfo.city,
        state: customerInfo.state,
        zipCode: customerInfo.zipCode,
      },
      customerPOC: {
        name: customerInfo.pocName,
        phone: customerInfo.pocPhone,
        email: customerInfo.pocEmail,
      },
      scheduledStartDate: new Date(customerInfo.targetStartDate),
      authorizationStatus: customerInfo.authorizationStatus,
      hasPurchaseOrders: customerInfo.hasPurchaseOrders,
      purchaseOrderNumber: customerInfo.hasPurchaseOrders
        ? customerInfo.purchaseOrderNumber
        : undefined,

      // Sensible defaults for fields not captured in the form
      jobType: JobType.Install,
      priority: Priority.Normal,
      scopeDescription: '',
      requiredSkills: [],
      requiredCrewSize: sriInternal.targetResources,
      estimatedLaborHours: sriInternal.requestedHours,
      scheduledEndDate: new Date(customerInfo.targetStartDate),

      // Pricing & Billing
      standardBillRate: pricingBilling.standardBillRate,
      overtimeBillRate: pricingBilling.overtimeBillRate,
      perDiem: pricingBilling.perDiem,
      invoicingProcess: pricingBilling.invoicingProcess as CreateJobDto['invoicingProcess'],

      // SRI Internal
      projectDirector: sriInternal.projectDirector,
      targetResources: sriInternal.targetResources,
      bizDevContact: sriInternal.bizDevContact,
      requestedHours: sriInternal.requestedHours,
      overtimeRequired: sriInternal.overtimeRequired,
      estimatedOvertimeHours: sriInternal.overtimeRequired
        ? (sriInternal.estimatedOvertimeHours ?? undefined)
        : undefined,
    };
  }

  /**
   * Submits a job by mapping form data to a DTO, dispatching the createJob action,
   * and returning an Observable that resolves on success or errors on failure.
   * Clears the draft on success.
   */
  submitJob(formValue: JobSetupFormValue): Observable<Job> {
    const dto = this.mapToCreateJobDto(formValue);
    this.store.dispatch(JobActions.createJob({ job: dto }));

    return new Observable<Job>((subscriber) => {
      this.actions$
        .pipe(
          ofType(JobActions.createJobSuccess, JobActions.createJobFailure),
          take(1),
        )
        .subscribe((action) => {
          if (action.type === JobActions.createJobSuccess.type) {
            this.clearDraft();
            subscriber.next((action as ReturnType<typeof JobActions.createJobSuccess>).job);
            subscriber.complete();
          } else {
            subscriber.error(
              (action as ReturnType<typeof JobActions.createJobFailure>).error,
            );
          }
        });
    });
  }

  /**
   * Writes the draft to sessionStorage (called after debounce).
   */
  private writeDraft(draft: JobSetupDraft): void {
    try {
      sessionStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('JobSetupService: failed to save draft', e);
    }
  }
}
