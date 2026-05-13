/**
 * Quote State Interface
 * Defines the shape of the quote state slice in the NgRx store
 */

import { QuoteWorkflow } from '../../models/quote-workflow.model';

export interface QuoteState {
  entities: { [id: string]: QuoteWorkflow };
  ids: string[];
  selectedId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export const initialQuoteState: QuoteState = {
  entities: {},
  ids: [],
  selectedId: null,
  loading: false,
  saving: false,
  error: null
};
