/**
 * Quote Selectors
 * Provides memoized selectors for accessing quote workflow state
 * with computed pipeline dashboard category selectors.
 *
 * Pipeline categories filter all quotes by WorkflowStatus using
 * the PIPELINE_CATEGORIES constant from the quote workflow model.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { QuoteState } from './quote.state';
import {
  PIPELINE_CATEGORIES,
  QuoteWorkflow,
  StatusTransition,
  WorkflowStatus
} from '../../models/quote-workflow.model';

// ============================================================================
// FEATURE SELECTOR
// ============================================================================

export const selectQuoteState = createFeatureSelector<QuoteState>('quotes');

// ============================================================================
// ENTITY SELECTORS
// ============================================================================

export const selectAllQuotes = createSelector(
  selectQuoteState,
  (state): QuoteWorkflow[] => state.ids.map(id => state.entities[id])
);

export const selectSelectedQuote = createSelector(
  selectQuoteState,
  (state): QuoteWorkflow | null =>
    state.selectedId ? state.entities[state.selectedId] ?? null : null
);

export const selectQuoteLoading = createSelector(
  selectQuoteState,
  (state): boolean => state.loading
);

export const selectQuoteSaving = createSelector(
  selectQuoteState,
  (state): boolean => state.saving
);

export const selectQuoteError = createSelector(
  selectQuoteState,
  (state): string | null => state.error
);

// ============================================================================
// PIPELINE DASHBOARD SELECTORS
// ============================================================================

/**
 * Helper: creates a selector that filters all quotes by the statuses
 * defined in a given PIPELINE_CATEGORIES key.
 */
function createPipelineCategorySelector(categoryKey: string) {
  const statuses: WorkflowStatus[] = PIPELINE_CATEGORIES[categoryKey];
  return createSelector(
    selectAllQuotes,
    (quotes): QuoteWorkflow[] =>
      quotes.filter(q => statuses.includes(q.workflowStatus))
  );
}

/** RFPs Received: Draft + Job_Summary_In_Progress */
export const selectRfpsReceived = createPipelineCategorySelector('rfpsReceived');

/** BOMs Not Ready: BOM_In_Progress + Validation_Rejected */
export const selectBomsNotReady = createPipelineCategorySelector('bomsNotReady');

/** BOMs Ready: Pending_Validation + Validation_Approved */
export const selectBomsReady = createPipelineCategorySelector('bomsReady');

/** Quotes Ready for Customer: Quote_Assembled */
export const selectQuotesReadyForCustomer = createPipelineCategorySelector('quotesReadyForCustomer');

/** Quotes Delivered: Quote_Delivered */
export const selectQuotesDelivered = createPipelineCategorySelector('quotesDelivered');

/** Quotes Converted to Job: Quote_Converted */
export const selectQuotesConverted = createPipelineCategorySelector('quotesConverted');

// ============================================================================
// STATUS SELECTORS
// ============================================================================

/** Current workflow status of the selected quote */
export const selectWorkflowStatus = createSelector(
  selectSelectedQuote,
  (quote): WorkflowStatus | null => quote?.workflowStatus ?? null
);

/** Status transition history of the selected quote */
export const selectStatusHistory = createSelector(
  selectSelectedQuote,
  (quote): StatusTransition[] => quote?.statusHistory ?? []
);
