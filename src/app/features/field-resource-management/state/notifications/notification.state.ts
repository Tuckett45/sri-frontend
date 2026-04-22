/**
 * Notification State Interface
 * Defines the shape of the notification state slice in the NgRx store
 */

import { EntityState } from '@ngrx/entity';
import { Notification } from '../../models/notification.model';

export interface NotificationState extends EntityState<Notification> {
  unreadCount: number;
  loading: boolean;
  error: string | null;
}
