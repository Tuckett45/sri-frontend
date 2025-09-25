import { Component, Signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { NotificationCategory, UserNotification } from '../../models/notification.model';

@Component({
  selector: 'app-user-notifications',
  templateUrl: './user-notifications.component.html',
  styleUrls: ['./user-notifications.component.scss'],
  standalone: false
})
export class UserNotificationsComponent {
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly notificationsEnabled = this.notificationService.notificationsEnabled;

  readonly unreadNotifications: Signal<UserNotification[]> = computed(() =>
    this.notifications().filter((notification) => !notification.read)
  );

  readonly readNotifications: Signal<UserNotification[]> = computed(() =>
    this.notifications().filter((notification) => notification.read)
  );

  constructor(
    private readonly notificationService: NotificationService,
    private readonly router: Router
  ) {}

  trackByNotificationId(_: number, notification: UserNotification): string {
    return notification.id;
  }

  markAsRead(notification: UserNotification): void {
    this.notificationService.markAsRead(notification.id);
  }

  markAsUnread(notification: UserNotification): void {
    this.notificationService.markAsUnread(notification.id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  goToAction(notification: UserNotification): void {
    if (!notification.action?.routerLink) {
      return;
    }

    this.router.navigateByUrl(notification.action.routerLink);
  }

  tagSeverity(category: NotificationCategory): 'info' | 'success' | 'warn' | 'danger' {
    switch (category) {
      case 'project':
        return 'success';
      case 'alert':
        return 'danger';
      case 'reminder':
        return 'warn';
      default:
        return 'info';
    }
  }
}
