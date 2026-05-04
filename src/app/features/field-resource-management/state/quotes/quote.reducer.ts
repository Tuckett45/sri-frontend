/**
 * Quote Reducer
 * Manages quote workflow state transitions for all actions
 */

import { createReducer, on } from '@ngrx/store';
import { QuoteState, initialQuoteState } from './quote.state';
import * as QuoteActions from './quote.actions';
import { QuoteWorkflow } from '../../models/quote-workflow.model';

/**
 * Helper to upsert a quote entity into the state.
 * Adds the quote if new, or replaces it if it already exists.
 */
function upsertQuote(state: QuoteState, quote: QuoteWorkflow): QuoteState {
  const exists = state.entities[quote.id] != null;
  return {
    ...state,
    entities: {
      ...state.entities,
      [quote.id]: quote
    },
    ids: exists ? state.ids : [...state.ids, quote.id]
  };
}

export const quoteReducer = createReducer(
  initialQuoteState,

  // ── Load Quotes ──────────────────────────────────────────────────────
  on(QuoteActions.loadQuotes, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(QuoteActions.loadQuotesSuccess, (state, { quotes }) => {
    const entities: { [id: string]: QuoteWorkflow } = {};
    const ids: string[] = [];
    for (const quote of quotes) {
      entities[quote.id] = quote;
      ids.push(quote.id);
    }
    return {
      ...state,
      entities,
      ids,
      loading: false,
      error: null
    };
  }),

  on(QuoteActions.loadQuotesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // ── Load Single Quote ────────────────────────────────────────────────
  on(QuoteActions.loadQuote, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(QuoteActions.loadQuoteSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    selectedId: quote.id,
    loading: false,
    error: null
  })),

  on(QuoteActions.loadQuoteFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // ── Create Quote ─────────────────────────────────────────────────────
  on(QuoteActions.createQuote, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.createQuoteSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    selectedId: quote.id,
    saving: false,
    error: null
  })),

  on(QuoteActions.createQuoteFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // ── Save Job Summary ─────────────────────────────────────────────────
  on(QuoteActions.saveJobSummary, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.saveJobSummarySuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Complete Job Summary ─────────────────────────────────────────────
  on(QuoteActions.completeJobSummary, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.completeJobSummarySuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Save BOM ─────────────────────────────────────────────────────────
  on(QuoteActions.saveBom, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.saveBomSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Complete BOM ─────────────────────────────────────────────────────
  on(QuoteActions.completeBom, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.completeBomSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Initiate Validation ──────────────────────────────────────────────
  on(QuoteActions.initiateValidation, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.initiateValidationSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Approve BOM ──────────────────────────────────────────────────────
  on(QuoteActions.approveBom, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.approveBomSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Reject BOM ───────────────────────────────────────────────────────
  on(QuoteActions.rejectBom, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.rejectBomSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Finalize Quote ───────────────────────────────────────────────────
  on(QuoteActions.finalizeQuote, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.finalizeQuoteSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Deliver Quote ────────────────────────────────────────────────────
  on(QuoteActions.deliverQuote, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.deliverQuoteSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  // ── Convert to Job ───────────────────────────────────────────────────
  on(QuoteActions.convertToJob, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(QuoteActions.convertToJobSuccess, (state, { quote }) => ({
    ...upsertQuote(state, quote),
    saving: false,
    error: null
  })),

  on(QuoteActions.convertToJobFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // ── SignalR Real-Time Update ─────────────────────────────────────────
  on(QuoteActions.quoteUpdatedRemotely, (state, { quote }) => ({
    ...upsertQuote(state, quote)
  })),

  // ── Generic Operation Failure ────────────────────────────────────────
  on(QuoteActions.quoteOperationFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  }))
);
