import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NotificationApiService, NotificationDto } from '../../../../services/notification-api.service';
import { FrmSignalRService } from '../../../../services/frm-signalr.service';
import { AuthService } from '../../../../../../services/auth.service';

/**
 * Widget that shows the current user's recent notifications
 * with real-time updates via SignalR.
 */
@Component({
  selector: 'app-notification-feed-widget',
  templateUrl: './notification-feed-widget.component.html',
  styleUrls: ['./notification-feed-widget.component.scss']
})
export class NotificationFeedWidgetComponent implements OnInit, OnDestroy {
  notifications: NotificationDto[] = [];
  unreadCount = 0;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private userId = '';

  constructor(
    private notificationApi: NotificationApiService,
    private signalRService: FrmSignalRService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = this.authService.getUser()?.id || '';
    this.loadNotifications();
    this.subscribeToRealTime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNotificationClick(notification: NotificationDto): void {
    // Mark as read
    if (!notification.readAt) {
      this.notificationApi.markAsRead(notification.id).subscribe(() => {
        notification.readAt = new Date().toISOString();
        notification.status = 'read';
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }
    // Navigate to related entity if available
    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  markAllRead(): void {
    this.notificationApi.markAllAsRead(this.userId).subscribe(result => {
      this.notifications.forEach(n => {
        n.readAt = result.markedAt;
        n.status = 'read';
      });
      this.unreadCount = 0;
    });
  }

  viewAll(): void {
    this.router.navigate(['/notifications']);
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      'job_assignment': 'work',
      'job_status_change': 'update',
      'timecard_approved': 'check_circle',
      'timecard_rejected': 'cancel',
      'timecard_correction_requested': 'edit_note',
      'clock_in': 'login',
      'clock_out': 'logout',
      'broadcast': 'campaign',
      'system_alert': 'warning'
    };
    return icons[type] || 'notifications';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  private loadNotifications(): void {
    if (!this.userId) return;
    this.loading = true;
    this.notificationApi.getMyNotifications(this.userId, { pageSize: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.notifications = result.items;
          this.unreadCount = result.unreadCount;
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load notifications';
          this.loading = false;
        }
      });
  }

  private subscribeToRealTime(): void {
    // Listen for real-time notifications from SignalR
    this.signalRService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        if (notification) {
          // Prepend new notification to list
          const dto: NotificationDto = {
            id: notification.id || crypto.randomUUID(),
            userId: this.userId,
            title: notification.message,
            message: notification.message,
            type: notification.type,
            priority: 'normal',
            channels: 'in-app',
            status: 'sent',
            createdAt: new Date(notification.createdAt || Date.now()).toISOString()
          };
          this.notifications.unshift(dto);
          this.unreadCount++;
          // Cap at 10 visible
          if (this.notifications.length > 10) {
            this.notifications.pop();
          }
        }
      });
  }
}
