/**
 * Notification Reducer
 * Manages notification state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Notification } from '../../models/notification.model';
import { NotificationState } from './notification.state';
import * as NotificationActions from './notification.actions';

// Entity adapter for normalized state management
export const notificationAdapter: EntityAdapter<Notification> = createEntityAdapter<Notification>({
  selectId: (notification: Notification) => notification.id,
  sortComparer: (a: Notification, b: Notification) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
});

// Initial state
export const initialState: NotificationState = notificationAdapter.getInitialState({
  unreadCount: 0,
  loading: false,
  error: null
});

// Helper function to calculate unread count
const calculateUnreadCount = (entities: { [id: string]: Notification | undefined }): number => {
  return Object.values(entities).filter((notification): notification is Notification => 
    notification !== undefined && !notification.isRead
  ).length;
};

// Reducer
export const notificationReducer = createReducer(
  initialState,

  // Load Notifications
  on(NotificationActions.loadNotifications, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(NotificationActions.loadNotificationsSuccess, (state, { notifications }) => {
    const newState = notificationAdapter.setAll(notifications, {
      ...state,
      loading: false,
      error: null
    });
    return {
      ...newState,
      unreadCount: calculateUnreadCount(newState.entities)
    };
  }),

  on(NotificationActions.loadNotificationsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Mark As Read
  on(NotificationActions.markAsRead, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(NotificationActions.markAsReadSuccess, (state, { id }) => {
    const newState = notificationAdapter.updateOne(
      { id, changes: { isRead: true } },
      {
        ...state,
        loading: false,
        error: null
      }
    );
    return {
      ...newState,
      unreadCount: calculateUnreadCount(newState.entities)
    };
  }),

  on(NotificationActions.markAsReadFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Mark All As Read
  on(NotificationActions.markAllAsRead, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(NotificationActions.markAllAsReadSuccess, (state) => {
    const updates = Object.keys(state.entities).map(id => ({
      id,
      changes: { isRead: true }
    }));
    return notificationAdapter.updateMany(updates, {
      ...state,
      unreadCount: 0,
      loading: false,
      error: null
    });
  }),

  on(NotificationActions.markAllAsReadFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Add Notification
  on(NotificationActions.addNotification, (state, { notification }) => {
    const newState = notificationAdapter.addOne(notification, state);
    return {
      ...newState,
      unreadCount: calculateUnreadCount(newState.entities)
    };
  }),

  // Remove Notification
  on(NotificationActions.removeNotification, (state, { id }) => {
    const newState = notificationAdapter.removeOne(id, state);
    return {
      ...newState,
      unreadCount: calculateUnreadCount(newState.entities)
    };
  }),

  // Clear All Notifications
  on(NotificationActions.clearAllNotifications, (state) =>
    notificationAdapter.removeAll({
      ...state,
      unreadCount: 0
    })
  )
);
