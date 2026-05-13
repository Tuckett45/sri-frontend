/**
 * Notification Selectors
 * Provides memoized selectors for accessing notification state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { NotificationState } from './notification.state';
import { notificationAdapter } from './notification.reducer';
import { NotificationType } from '../../models/notification.model';

// Feature selector
export const selectNotificationState = createFeatureSelector<NotificationState>('notifications');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = notificationAdapter.getSelectors();

// Select all notifications
export const selectAllNotifications = createSelector(
  selectNotificationState,
  selectAll
);

// Select notification entities
export const selectNotificationEntities = createSelector(
  selectNotificationState,
  selectEntities
);

// Select notification by ID
export const selectNotificationById = (id: string) => createSelector(
  selectNotificationEntities,
  (entities) => entities[id]
);

// Select loading state
export const selectNotificationsLoading = createSelector(
  selectNotificationState,
  (state) => state.loading
);

// Select error state
export const selectNotificationsError = createSelector(
  selectNotificationState,
  (state) => state.error
);

// Select unread count
export const selectUnreadCount = createSelector(
  selectNotificationState,
  (state) => state.unreadCount
);

// Select total count
export const selectNotificationsTotal = createSelector(
  selectNotificationState,
  selectTotal
);

// Select unread notifications
export const selectUnreadNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(notification => !notification.isRead)
);

// Select read notifications
export const selectReadNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(notification => notification.isRead)
);

// Select notifications by type
export const selectNotificationsByType = (type: NotificationType) => createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(notification => notification.type === type)
);

// Select recent notifications (last 24 hours)
export const selectRecentNotifications = createSelector(
  selectAllNotifications,
  (notifications) => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    return notifications.filter(notification => 
      new Date(notification.timestamp) >= twentyFourHoursAgo
    );
  }
);

// Select today's notifications
export const selectTodaysNotifications = createSelector(
  selectAllNotifications,
  (notifications) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return notifications.filter(notification => {
      const notificationDate = new Date(notification.timestamp);
      return notificationDate >= today && notificationDate < tomorrow;
    });
  }
);

// Select notifications grouped by date
export const selectNotificationsGroupedByDate = createSelector(
  selectAllNotifications,
  (notifications) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = {
      today: [] as typeof notifications,
      yesterday: [] as typeof notifications,
      earlier: [] as typeof notifications
    };

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.timestamp);
      notificationDate.setHours(0, 0, 0, 0);

      if (notificationDate.getTime() === today.getTime()) {
        grouped.today.push(notification);
      } else if (notificationDate.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(notification);
      } else {
        grouped.earlier.push(notification);
      }
    });

    return grouped;
  }
);

// Select has unread notifications
export const selectHasUnreadNotifications = createSelector(
  selectUnreadCount,
  (count) => count > 0
);

// Select job-related notifications
export const selectJobNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(notification => 
    notification.relatedEntityType === 'job'
  )
);

// Select technician-related notifications
export const selectTechnicianNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(notification => 
    notification.relatedEntityType === 'technician'
  )
);
