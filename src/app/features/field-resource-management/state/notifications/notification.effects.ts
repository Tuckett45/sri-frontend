/**
 * Notification Effects
 * Handles side effects for notification actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as NotificationActions from './notification.actions';

@Injectable()
export class NotificationEffects {
  // Load Notifications Effect
  loadNotifications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.loadNotifications),
      switchMap(({ userId }) =>
        // TODO: Replace with actual NotificationService call when service is implemented
        // this.notificationService.getNotifications(userId).pipe(
        of([]).pipe( // Placeholder - returns empty array
          map((notifications) =>
            NotificationActions.loadNotificationsSuccess({ notifications })
          ),
          catchError((error) =>
            of(NotificationActions.loadNotificationsFailure({ 
              error: error.message || 'Failed to load notifications' 
            }))
          )
        )
      )
    )
  );

  // Mark As Read Effect
  markAsRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.markAsRead),
      switchMap(({ id }) =>
        // TODO: Replace with actual NotificationService call when service is implemented
        // this.notificationService.markAsRead(id).pipe(
        of(void 0).pipe( // Placeholder
          map(() =>
            NotificationActions.markAsReadSuccess({ id })
          ),
          catchError((error) =>
            of(NotificationActions.markAsReadFailure({ 
              error: error.message || 'Failed to mark notification as read' 
            }))
          )
        )
      )
    )
  );

  // Mark All As Read Effect
  markAllAsRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.markAllAsRead),
      switchMap(({ userId }) =>
        // TODO: Replace with actual NotificationService call when service is implemented
        // this.notificationService.markAllAsRead(userId).pipe(
        of(void 0).pipe( // Placeholder
          map(() =>
            NotificationActions.markAllAsReadSuccess()
          ),
          catchError((error) =>
            of(NotificationActions.markAllAsReadFailure({ 
              error: error.message || 'Failed to mark all notifications as read' 
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions
    // TODO: Inject NotificationService when implemented
    // private notificationService: NotificationService
  ) {}
}
