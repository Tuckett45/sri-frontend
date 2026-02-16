/**
 * Notification Actions
 * Defines all actions for notification state management
 */

import { createAction, props } from '@ngrx/store';
import { Notification } from '../../models/notification.model';

// Load Notifications
export const loadNotifications = createAction(
  '[Notification] Load Notifications',
  props<{ userId: string }>()
);

export const loadNotificationsSuccess = createAction(
  '[Notification] Load Notifications Success',
  props<{ notifications: Notification[] }>()
);

export const loadNotificationsFailure = createAction(
  '[Notification] Load Notifications Failure',
  props<{ error: string }>()
);

// Mark As Read
export const markAsRead = createAction(
  '[Notification] Mark As Read',
  props<{ id: string }>()
);

export const markAsReadSuccess = createAction(
  '[Notification] Mark As Read Success',
  props<{ id: string }>()
);

export const markAsReadFailure = createAction(
  '[Notification] Mark As Read Failure',
  props<{ error: string }>()
);

// Mark All As Read
export const markAllAsRead = createAction(
  '[Notification] Mark All As Read',
  props<{ userId: string }>()
);

export const markAllAsReadSuccess = createAction(
  '[Notification] Mark All As Read Success'
);

export const markAllAsReadFailure = createAction(
  '[Notification] Mark All As Read Failure',
  props<{ error: string }>()
);

// Add Notification (for real-time updates)
export const addNotification = createAction(
  '[Notification] Add Notification',
  props<{ notification: Notification }>()
);

// Remove Notification
export const removeNotification = createAction(
  '[Notification] Remove Notification',
  props<{ id: string }>()
);

// Clear All Notifications
export const clearAllNotifications = createAction(
  '[Notification] Clear All Notifications'
);
