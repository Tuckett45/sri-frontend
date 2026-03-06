/**
 * Notification Effects
 * Handles side effects for notification actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as NotificationActions from './notification.actions';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class NotificationEffects {
  // Load Notifications Effect
  loadNotifications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.loadNotifications),
      switchMap(({ userId }) =>
        this.notificationService.getNotifications(userId).pipe(
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
        this.notificationService.markAsRead(id).pipe(
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
        this.notificationService.markAllAsRead(userId).pipe(
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
    private actions$: Actions,
    private notificationService: NotificationService
  ) {}
}
