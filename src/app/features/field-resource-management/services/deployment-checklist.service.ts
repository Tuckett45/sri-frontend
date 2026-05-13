import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { local_environment } from '../../../../environments/environments';
import {
  ChecklistPhase,
  ChecklistStatus,
  CloseOutPhaseData,
  DeploymentChecklist,
  EodEntry,
  JobDetailsPhaseData,
  PhaseStatus,
  PreInstallationPhaseData
} from '../models/deployment-checklist.model';

/**
 * Draft storage shape persisted to sessionStorage.
 */
interface ChecklistDraft {
  formValue: any;
  savedAt: string; // ISO timestamp
}

/**
 * Service for managing Deployment Checklist data and operations.
 *
 * Handles HTTP communication with the backend API for checklist CRUD,
 * session-storage draft persistence with debounced saves, and status
 * computation helpers that mirror the NgRx selector logic.
 */
@Injectable({ providedIn: 'root' })
export class DeploymentChecklistService {
  private readonly apiUrl = `${local_environment.apiUrl}/jobs`;
  private readonly DRAFT_KEY_PREFIX = 'frm_checklist_draft';
  private readonly DEBOUNCE_MS = 3000;
  private readonly DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  private draftSave$ = new Subject<{ jobId: string; phase: ChecklistPhase; formValue: any }>();

  constructor(private http: HttpClient) {
    this.draftSave$
      .pipe(debounceTime(this.DEBOUNCE_MS))
      .subscribe(({ jobId, phase, formValue }) => this.writeDraft(jobId, phase, formValue));
  }

  // ===========================================================================
  // API Methods
  // ===========================================================================

  /**
   * Loads the full deployment checklist for a job.
   * @param jobId Job identifier
   */
  getChecklist(jobId: string): Observable<DeploymentChecklist> {
    return this.http.get<DeploymentChecklist>(
      `${this.apiUrl}/${jobId}/deployment-checklist`
    );
  }

  /**
   * Creates a new deployment checklist for a job (e.g. on OnSite transition).
   * @param jobId Job identifier
   */
  createChecklist(jobId: string): Observable<DeploymentChecklist> {
    return this.http.post<DeploymentChecklist>(
      `${this.apiUrl}/${jobId}/deployment-checklist`,
      {}
    );
  }

  /**
   * Saves the Job Details phase data.
   * @param jobId Job identifier
   * @param data Job Details phase form data
   */
  saveJobDetailsPhase(jobId: string, data: JobDetailsPhaseData): Observable<JobDetailsPhaseData> {
    return this.http.put<JobDetailsPhaseData>(
      `${this.apiUrl}/${jobId}/deployment-checklist/job-details`,
      data
    );
  }

  /**
   * Saves the Pre-Installation phase data.
   * @param jobId Job identifier
   * @param data Pre-Installation phase form data
   */
  savePreInstallationPhase(jobId: string, data: PreInstallationPhaseData): Observable<PreInstallationPhaseData> {
    return this.http.put<PreInstallationPhaseData>(
      `${this.apiUrl}/${jobId}/deployment-checklist/pre-installation`,
      data
    );
  }

  /**
   * Adds a new EOD entry to the checklist.
   * @param jobId Job identifier
   * @param entry EOD entry data
   */
  saveEodEntry(jobId: string, entry: EodEntry): Observable<EodEntry> {
    return this.http.post<EodEntry>(
      `${this.apiUrl}/${jobId}/deployment-checklist/eod-entries`,
      entry
    );
  }

  /**
   * Updates an existing EOD entry.
   * @param jobId Job identifier
   * @param entryId EOD entry identifier
   * @param entry Updated EOD entry data
   */
  updateEodEntry(jobId: string, entryId: string, entry: EodEntry): Observable<EodEntry> {
    return this.http.put<EodEntry>(
      `${this.apiUrl}/${jobId}/deployment-checklist/eod-entries/${entryId}`,
      entry
    );
  }

  /**
   * Saves the Close-Out phase data.
   * @param jobId Job identifier
   * @param data Close-Out phase form data
   */
  saveCloseOutPhase(jobId: string, data: CloseOutPhaseData): Observable<CloseOutPhaseData> {
    return this.http.put<CloseOutPhaseData>(
      `${this.apiUrl}/${jobId}/deployment-checklist/close-out`,
      data
    );
  }

  /**
   * Exports the checklist as a PDF blob.
   * @param jobId Job identifier
   */
  exportPdf(jobId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${jobId}/deployment-checklist/export-pdf`,
      { responseType: 'blob' }
    );
  }

  // ===========================================================================
  // Draft Persistence Methods
  // ===========================================================================

  /**
   * Queues a draft save with 3-second debounce to sessionStorage.
   * @param jobId Job identifier
   * @param phase Checklist phase
   * @param formValue Current form state
   */
  saveDraft(jobId: string, phase: ChecklistPhase, formValue: any): void {
    this.draftSave$.next({ jobId, phase, formValue });
  }

  /**
   * Restores a previously saved draft from sessionStorage.
   * Discards drafts older than 24 hours.
   * @param jobId Job identifier
   * @param phase Checklist phase
   * @returns The saved form value or null if none exists, expired, or parse fails
   */
  restoreDraft(jobId: string, phase: ChecklistPhase): any | null {
    try {
      const key = this.buildDraftKey(jobId, phase);
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const draft: ChecklistDraft = JSON.parse(raw);

      // Discard drafts older than 24 hours
      const savedAt = new Date(draft.savedAt).getTime();
      if (isNaN(savedAt) || Date.now() - savedAt > this.DRAFT_MAX_AGE_MS) {
        sessionStorage.removeItem(key);
        return null;
      }

      return draft.formValue;
    } catch (e) {
      console.warn('DeploymentChecklistService: failed to restore draft', e);
      return null;
    }
  }

  /**
   * Removes the saved draft for a specific phase from sessionStorage.
   * @param jobId Job identifier
   * @param phase Checklist phase
   */
  clearDraft(jobId: string, phase: ChecklistPhase): void {
    try {
      sessionStorage.removeItem(this.buildDraftKey(jobId, phase));
    } catch (e) {
      console.warn('DeploymentChecklistService: failed to clear draft', e);
    }
  }

  /**
   * Removes all saved drafts for a job from sessionStorage.
   * @param jobId Job identifier
   */
  clearAllDrafts(jobId: string): void {
    const phases: ChecklistPhase[] = ['jobDetails', 'preInstallation', 'eodReports', 'closeOut'];
    phases.forEach(phase => this.clearDraft(jobId, phase));
  }

  // ===========================================================================
  // Status Computation Helpers
  // ===========================================================================

  /**
   * Computes the status of a single checklist phase.
   * Mirrors the logic in checklist.selectors.ts.
   * @param phase Phase identifier
   * @param data Phase data (typed per phase)
   */
  computePhaseStatus(phase: ChecklistPhase, data: any): PhaseStatus {
    switch (phase) {
      case 'jobDetails':
        return this.computeJobDetailsStatus(data as JobDetailsPhaseData | null);
      case 'preInstallation':
        return this.computePreInstallationStatus(data as PreInstallationPhaseData | null);
      case 'eodReports':
        return this.computeEodReportStatus(data);
      case 'closeOut':
        return this.computeCloseOutStatus(data as CloseOutPhaseData | null);
      default:
        return PhaseStatus.NotStarted;
    }
  }

  /**
   * Computes the overall checklist status from the full checklist data.
   * Mirrors the logic in checklist.selectors.ts.
   * @param checklist Full deployment checklist
   */
  computeChecklistStatus(checklist: DeploymentChecklist): ChecklistStatus {
    const jobDetailsStatus = this.computeJobDetailsStatus(checklist.jobDetails);
    const preInstallationStatus = this.computePreInstallationStatus(checklist.preInstallation);
    const closeOutStatus = this.computeCloseOutStatus(checklist.closeOut);
    const eodReportStatus = this.computeEodReportStatusFromChecklist(
      checklist.eodEntries,
      closeOutStatus
    );

    const statuses = [jobDetailsStatus, preInstallationStatus, eodReportStatus, closeOutStatus];

    if (statuses.every(s => s === PhaseStatus.NotStarted)) {
      return ChecklistStatus.NotStarted;
    }

    if (statuses.every(s => s === PhaseStatus.Completed)) {
      return ChecklistStatus.Completed;
    }

    return ChecklistStatus.InProgress;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Builds the sessionStorage key for a draft.
   */
  private buildDraftKey(jobId: string, phase: ChecklistPhase): string {
    return `${this.DRAFT_KEY_PREFIX}_${jobId}_${phase}`;
  }

  /**
   * Writes a draft to sessionStorage.
   */
  private writeDraft(jobId: string, phase: ChecklistPhase, formValue: any): void {
    try {
      const draft: ChecklistDraft = {
        formValue,
        savedAt: new Date().toISOString()
      };
      sessionStorage.setItem(this.buildDraftKey(jobId, phase), JSON.stringify(draft));
    } catch (e) {
      console.warn('DeploymentChecklistService: failed to save draft', e);
    }
  }

  /**
   * Computes Job Details phase status.
   *
   * Completed: technicalLead.name is non-empty, sriJobNumbers has at least one
   *            non-empty entry, and jobStartDate is non-null.
   * NotStarted: all fields are empty/default.
   * InProgress: otherwise.
   */
  private computeJobDetailsStatus(data: JobDetailsPhaseData | null): PhaseStatus {
    if (!data) {
      return PhaseStatus.NotStarted;
    }

    const hasLeadName = !!data.technicalLead?.name?.trim();
    const hasSriJobNumber = data.sriJobNumbers?.some(n => !!n?.trim()) ?? false;
    const hasStartDate = data.jobStartDate != null;

    if (hasLeadName && hasSriJobNumber && hasStartDate) {
      return PhaseStatus.Completed;
    }

    // Check if all fields are empty (NotStarted)
    const allEmpty =
      !hasLeadName &&
      !hasSriJobNumber &&
      !hasStartDate &&
      !data.jobCompleteDate &&
      !data.siteName?.trim() &&
      !data.suiteNumber?.trim() &&
      !data.street?.trim() &&
      !data.cityState?.trim() &&
      !data.zipCode?.trim() &&
      !data.proposedValidationDateTime &&
      !data.statementOfWork?.trim() &&
      (!data.customerJobNumbers?.some(n => !!n?.trim())) &&
      (!data.changeTickets?.some(n => !!n?.trim())) &&
      (!data.siteAccessTickets?.some(n => !!n?.trim())) &&
      !data.technician1?.name?.trim() &&
      !data.technician2?.name?.trim() &&
      !data.sriProjectLead?.name?.trim() &&
      !data.primaryCustomerContact?.name?.trim() &&
      !data.secondaryCustomerContact?.name?.trim();

    return allEmpty ? PhaseStatus.NotStarted : PhaseStatus.InProgress;
  }

  /**
   * Computes Pre-Installation phase status.
   *
   * NotStarted: no items have a response selected (all null).
   * Completed: all 11 items have a response of Yes or NotApplicable,
   *            OR all items have any response selected and markedComplete is true.
   * InProgress: otherwise.
   */
  private computePreInstallationStatus(data: PreInstallationPhaseData | null): PhaseStatus {
    if (!data || !data.items || data.items.length === 0) {
      return PhaseStatus.NotStarted;
    }

    const items = data.items;
    const respondedItems = items.filter(item => item.response !== null);
    const allResponded = respondedItems.length === items.length;
    const allYesOrNA = items.every(item => item.response === 'Yes' || item.response === 'NotApplicable');

    if (respondedItems.length === 0) {
      return PhaseStatus.NotStarted;
    }

    if (allYesOrNA || (allResponded && data.markedComplete)) {
      return PhaseStatus.Completed;
    }

    return PhaseStatus.InProgress;
  }

  /**
   * Computes EOD Report phase status from raw data passed to computePhaseStatus.
   * Expects data in the shape: { eodEntries: EodEntry[], closeOutStatus: PhaseStatus }
   *
   * NotStarted: eodEntries array is empty.
   * Completed: Close-Out phase has PhaseStatus.Completed.
   * InProgress: at least one EOD entry exists and Close-Out is not Completed.
   */
  private computeEodReportStatus(data: any): PhaseStatus {
    const entries: EodEntry[] = data?.eodEntries ?? [];
    const closeOutStatus: PhaseStatus = data?.closeOutStatus ?? PhaseStatus.NotStarted;

    return this.computeEodReportStatusFromChecklist(entries, closeOutStatus);
  }

  /**
   * Computes EOD Report phase status from entries and close-out status.
   */
  private computeEodReportStatusFromChecklist(entries: EodEntry[], closeOutStatus: PhaseStatus): PhaseStatus {
    if (!entries || entries.length === 0) {
      return PhaseStatus.NotStarted;
    }

    if (closeOutStatus === PhaseStatus.Completed) {
      return PhaseStatus.Completed;
    }

    return PhaseStatus.InProgress;
  }

  /**
   * Computes Close-Out phase status.
   *
   * NotStarted: no fields have been populated (all empty/null).
   * Completed: siteAcceptance.customerName is non-empty,
   *            siteAcceptance.dateTimeSiteAccepted is non-null,
   *            and all finalInspectionItems have a response selected.
   * InProgress: otherwise.
   */
  private computeCloseOutStatus(data: CloseOutPhaseData | null): PhaseStatus {
    if (!data) {
      return PhaseStatus.NotStarted;
    }

    const hasCustomerName = !!data.siteAcceptance?.customerName?.trim();
    const hasAcceptedDate = data.siteAcceptance?.dateTimeSiteAccepted != null;
    const allInspectionResponded = data.finalInspectionItems?.length > 0 &&
      data.finalInspectionItems.every(item => item.response !== null);

    if (hasCustomerName && hasAcceptedDate && allInspectionResponded) {
      return PhaseStatus.Completed;
    }

    // Check if all fields are empty (NotStarted)
    const hasSriLead = !!data.sriLead?.name?.trim() || !!data.sriLead?.company?.trim() || data.sriLead?.date != null;
    const hasCustomerLead = !!data.customerLead?.name?.trim() || !!data.customerLead?.company?.trim() || data.customerLead?.date != null;
    const hasOtherParticipants = !!data.otherParticipants?.trim();
    const hasAnyPictureResponse = data.requiredPictures?.some(item => item.response !== null) ?? false;
    const hasAnyInspectionResponse = data.finalInspectionItems?.some(item => item.response !== null) ?? false;
    const hasCustomerEmail = !!data.siteAcceptance?.customerEmail?.trim();
    const hasCustomerPhone = !!data.siteAcceptance?.customerPhone?.trim();

    const allEmpty = !hasCustomerName && !hasAcceptedDate && !hasSriLead && !hasCustomerLead &&
      !hasOtherParticipants && !hasAnyPictureResponse && !hasAnyInspectionResponse &&
      !hasCustomerEmail && !hasCustomerPhone;

    return allEmpty ? PhaseStatus.NotStarted : PhaseStatus.InProgress;
  }
}
