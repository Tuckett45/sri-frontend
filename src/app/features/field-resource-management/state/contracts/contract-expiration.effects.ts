/**
 * Contract Expiration Effects
 *
 * Handles side effects for contract expiration checks:
 * - checkContractExpirations$: fetches expiring contracts from the API and
 *   sends a notification for each contract approaching expiration (within 30 days).
 *
 * This is a non-dispatching effect — it performs HTTP calls and triggers
 * notifications as side effects without dispatching further NgRx actions.
 *
 * Requirement: 7.4
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import { checkContractExpirations } from './contract-expiration.actions';
import { TIMECARD_ENDPOINTS } from '../../api/api-endpoints';
import { Contract } from '../../../../models/time-payroll.model';
import { ContractDateService } from '../../services/contract-date.service';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';
import { AuthService } from '../../../../services/auth.service';

@Injectable()
export class ContractExpirationEffects {

  /**
   * Effect: checkContractExpirations$
   *
   * Listens for the checkContractExpirations action, fetches contracts
   * approaching expiration from the API, and for each contract that
   * is approaching expiration (within 30 days), sends a notification
   * to the current user (manager) via FrmNotificationAdapterService.
   *
   * This is a non-dispatching effect (dispatch: false).
   *
   * Requirement 7.4
   */
  checkContractExpirations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkContractExpirations),
      switchMap(() =>
        this.http.get<Contract[]>(TIMECARD_ENDPOINTS.getExpiringContracts()).pipe(
          tap(contracts => {
            const user = this.authService.getUser();
            const managerId = user?.id ?? 'unknown';

            for (const contract of contracts) {
              // Ensure dates are Date objects (API may return strings)
              const contractWithDates: Contract = {
                ...contract,
                startDate: new Date(contract.startDate),
                endDate: new Date(contract.endDate)
              };

              if (this.contractDateService.isContractApproachingExpiration(contractWithDates)) {
                this.notificationService.sendContractExpiringNotification(
                  managerId,
                  contractWithDates.id,
                  contractWithDates.name,
                  contractWithDates.endDate
                ).subscribe();
              }
            }
          }),
          catchError(error => {
            console.error('Failed to check expiring contracts:', error);
            return EMPTY;
          })
        )
      )
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private http: HttpClient,
    private contractDateService: ContractDateService,
    private notificationService: FrmNotificationAdapterService,
    private authService: AuthService
  ) {}
}
