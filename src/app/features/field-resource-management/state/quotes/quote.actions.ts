/**
 * Quote Actions
 * Defines all actions for quote workflow state management
 */

import { createAction, props } from '@ngrx/store';
import {
  BomData,
  ConvertToJobData,
  JobSummaryData,
  QuoteEmailData,
  QuoteFilters,
  QuoteWorkflow,
  RfpRecord
} from '../../models/quote-workflow.model';
import { Job } from '../../models/job.model';

// Load Quotes
export const loadQuotes = createAction(
  '[Quote] Load Quotes',
  props<{ filters?: QuoteFilters }>()
);

export const loadQuotesSuccess = createAction(
  '[Quote] Load Quotes Success',
  props<{ quotes: QuoteWorkflow[] }>()
);

export const loadQuotesFailure = createAction(
  '[Quote] Load Quotes Failure',
  props<{ error: string }>()
);

// Load Single Quote
export const loadQuote = createAction(
  '[Quote] Load Quote',
  props<{ quoteId: string }>()
);

export const loadQuoteSuccess = createAction(
  '[Quote] Load Quote Success',
  props<{ quote: QuoteWorkflow }>()
);

export const loadQuoteFailure = createAction(
  '[Quote] Load Quote Failure',
  props<{ error: string }>()
);

// Create Quote
export const createQuote = createAction(
  '[Quote] Create Quote',
  props<{ rfpData: RfpRecord }>()
);

export const createQuoteSuccess = createAction(
  '[Quote] Create Quote Success',
  props<{ quote: QuoteWorkflow }>()
);

export const createQuoteFailure = createAction(
  '[Quote] Create Quote Failure',
  props<{ error: string }>()
);

// Job Summary
export const saveJobSummary = createAction(
  '[Quote] Save Job Summary',
  props<{ quoteId: string; data: JobSummaryData }>()
);

export const saveJobSummarySuccess = createAction(
  '[Quote] Save Job Summary Success',
  props<{ quote: QuoteWorkflow }>()
);

export const completeJobSummary = createAction(
  '[Quote] Complete Job Summary',
  props<{ quoteId: string }>()
);

export const completeJobSummarySuccess = createAction(
  '[Quote] Complete Job Summary Success',
  props<{ quote: QuoteWorkflow }>()
);

// BOM
export const saveBom = createAction(
  '[Quote] Save BOM',
  props<{ quoteId: string; data: BomData }>()
);

export const saveBomSuccess = createAction(
  '[Quote] Save BOM Success',
  props<{ quote: QuoteWorkflow }>()
);

export const completeBom = createAction(
  '[Quote] Complete BOM',
  props<{ quoteId: string }>()
);

export const completeBomSuccess = createAction(
  '[Quote] Complete BOM Success',
  props<{ quote: QuoteWorkflow }>()
);

// Validation
export const initiateValidation = createAction(
  '[Quote] Initiate Validation',
  props<{ quoteId: string }>()
);

export const initiateValidationSuccess = createAction(
  '[Quote] Initiate Validation Success',
  props<{ quote: QuoteWorkflow }>()
);

export const approveBom = createAction(
  '[Quote] Approve BOM',
  props<{ quoteId: string }>()
);

export const approveBomSuccess = createAction(
  '[Quote] Approve BOM Success',
  props<{ quote: QuoteWorkflow }>()
);

export const rejectBom = createAction(
  '[Quote] Reject BOM',
  props<{ quoteId: string; comments: string }>()
);

export const rejectBomSuccess = createAction(
  '[Quote] Reject BOM Success',
  props<{ quote: QuoteWorkflow }>()
);

// Assembly & Delivery
export const finalizeQuote = createAction(
  '[Quote] Finalize',
  props<{ quoteId: string }>()
);

export const finalizeQuoteSuccess = createAction(
  '[Quote] Finalize Success',
  props<{ quote: QuoteWorkflow }>()
);

export const deliverQuote = createAction(
  '[Quote] Deliver',
  props<{ quoteId: string; emailData: QuoteEmailData }>()
);

export const deliverQuoteSuccess = createAction(
  '[Quote] Deliver Success',
  props<{ quote: QuoteWorkflow }>()
);

// Convert to Job
export const convertToJob = createAction(
  '[Quote] Convert to Job',
  props<{ quoteId: string; data: ConvertToJobData }>()
);

export const convertToJobSuccess = createAction(
  '[Quote] Convert to Job Success',
  props<{ quote: QuoteWorkflow; job: Job }>()
);

export const convertToJobFailure = createAction(
  '[Quote] Convert to Job Failure',
  props<{ error: string }>()
);

// SignalR
export const quoteUpdatedRemotely = createAction(
  '[Quote] Updated Remotely',
  props<{ quote: QuoteWorkflow }>()
);

// Generic failure for save operations
export const quoteOperationFailure = createAction(
  '[Quote] Operation Failure',
  props<{ error: string }>()
);
