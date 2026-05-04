import { createAction } from '@ngrx/store';

/**
 * Action to trigger a check for contracts approaching expiration.
 * Can be dispatched on app init, via a periodic timer, or manually.
 *
 * Requirement: 7.4
 */
export const checkContractExpirations = createAction(
  '[Contract] Check Contract Expirations'
);
