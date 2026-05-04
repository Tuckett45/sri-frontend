/**
 * Deployment Checklist Selectors
 * Provides memoized selectors for accessing deployment checklist state
 * with computed phase and checklist status derivation.
 *
 * Status Computation:
 * - Checklist status is derived from the four phase statuses
 * - Each phase status is computed from the underlying phase data
 * - All status values are computed (never stored), ensuring consistency
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ChecklistState } from './checklist.state';
import {
  ChecklistStatus,
  CloseOutPhaseData,
  DeploymentChecklist,
  EodEntry,
  JobDetailsPhaseData,
  PhaseStatus,
  PreInstallationPhaseData
} from '../../models/deployment-checklist.model';

// ============================================================================
// FEATURE SELECTOR
// ============================================================================

export const selectChecklistState = createFeatureSelector<ChecklistState>('deploymentChecklist');

// ============================================================================
// BASIC SELECTORS
// ============================================================================

export const selectChecklist = createSelector(
  selectChecklistState,
  (state) => state.checklist
);

export const selectChecklistLoading = createSelector(
  selectChecklistState,
  (state) => state.loading
);

export const selectChecklistSaving = createSelector(
  selectChecklistState,
  (state) => state.saving
);

export const selectChecklistError = createSelector(
  selectChecklistState,
  (state) => state.error
);

export const selectChecklistLastSavedAt = createSelector(
  selectChecklistState,
  (state) => state.lastSavedAt
);

// ============================================================================
// PHASE DATA SELECTORS
// ============================================================================

export const selectJobDetailsPhase = createSelector(
  selectChecklist,
  (checklist) => checklist?.jobDetails ?? null
);

export const selectPreInstallationPhase = createSelector(
  selectChecklist,
  (checklist) => checklist?.preInstallation ?? null
);

export const selectEodEntries = createSelector(
  selectChecklist,
  (checklist) => checklist?.eodEntries ?? []
);

export const selectCloseOutPhase = createSelector(
  selectChecklist,
  (checklist) => checklist?.closeOut ?? null
);

// ============================================================================
// PHASE STATUS COMPUTATION HELPERS
// ============================================================================

/**
 * Computes Job Details phase status.
 *
 * Completed: technicalLead.name is non-empty, sriJobNumbers has at least one
 *            non-empty entry, and jobStartDate is non-null.
 * NotStarted: all fields are empty/default.
 * InProgress: otherwise.
 */
function computeJobDetailsPhaseStatus(data: JobDetailsPhaseData | null): PhaseStatus {
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
function computePreInstallationPhaseStatus(data: PreInstallationPhaseData | null): PhaseStatus {
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
 * Computes Close-Out phase status.
 *
 * NotStarted: no fields have been populated (all empty/null).
 * Completed: siteAcceptance.customerName is non-empty,
 *            siteAcceptance.dateTimeSiteAccepted is non-null,
 *            and all finalInspectionItems have a response selected.
 * InProgress: otherwise.
 */
function computeCloseOutPhaseStatus(data: CloseOutPhaseData | null): PhaseStatus {
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

// ============================================================================
// COMPUTED STATUS SELECTORS
// ============================================================================

export const selectJobDetailsPhaseStatus = createSelector(
  selectJobDetailsPhase,
  (data) => computeJobDetailsPhaseStatus(data)
);

export const selectPreInstallationPhaseStatus = createSelector(
  selectPreInstallationPhase,
  (data) => computePreInstallationPhaseStatus(data)
);

export const selectCloseOutPhaseStatus = createSelector(
  selectCloseOutPhase,
  (data) => computeCloseOutPhaseStatus(data)
);

/**
 * EOD Report phase status depends on both eodEntries and Close-Out phase status.
 *
 * NotStarted: eodEntries array is empty.
 * Completed: Close-Out phase has PhaseStatus.Completed.
 * InProgress: at least one EOD entry exists and Close-Out is not Completed.
 */
export const selectEodReportPhaseStatus = createSelector(
  selectEodEntries,
  selectCloseOutPhaseStatus,
  (entries, closeOutStatus) => {
    if (!entries || entries.length === 0) {
      return PhaseStatus.NotStarted;
    }

    if (closeOutStatus === PhaseStatus.Completed) {
      return PhaseStatus.Completed;
    }

    return PhaseStatus.InProgress;
  }
);

/**
 * Overall checklist status derived from all four phase statuses.
 *
 * NotStarted: all four phases are NotStarted.
 * Completed: all four phases are Completed.
 * InProgress: otherwise.
 */
export const selectChecklistStatus = createSelector(
  selectJobDetailsPhaseStatus,
  selectPreInstallationPhaseStatus,
  selectEodReportPhaseStatus,
  selectCloseOutPhaseStatus,
  (jobDetails, preInstallation, eodReport, closeOut): ChecklistStatus => {
    const statuses = [jobDetails, preInstallation, eodReport, closeOut];

    if (statuses.every(s => s === PhaseStatus.NotStarted)) {
      return ChecklistStatus.NotStarted;
    }

    if (statuses.every(s => s === PhaseStatus.Completed)) {
      return ChecklistStatus.Completed;
    }

    return ChecklistStatus.InProgress;
  }
);
