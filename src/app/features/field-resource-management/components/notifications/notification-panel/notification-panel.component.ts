import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Notification } from '../../../models/notification.model';
import * as NotificationActions from '../../../state/notifications/notification.actions';
import * as NotificationSelectors from '../../../state/notifications/notification.selectors';

/**
 * Notification Panel Component
 * Displays in-app notifications with grouping by date and navigation to relevant views
 */
@Component({
  selector: 'app-notification-panel',
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss']
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;
  groupedNotifications: { [key: string]: Notification[] } = {};
  
  // Notification sound preference (can be stored in user preferences)
  notificationSoundEnabled = true;
  
  private destroy$ = new Subject<void>();
  private previousUnreadCount = 0;

  constructor(
    private store: Store,
    private router: Router
  ) {
    this.notifications$ = this.store.select(NotificationSelectors.selectAllNotifications);
    this.unreadCount$ = this.store.select(NotificationSelectors.selectUnreadCount);
  }

  ngOnInit(): void {
    // Load notifications for current user
    // TODO: Get current user ID from auth service
    this.store.dispatch(NotificationActions.loadNotifications({ userId: 'current-user' }));
    
    // Group notifications by date
    this.notifications$.pipe(takeUntil(this.destroy$)).subscribe(notifications => {
      this.groupedNotifications = this.groupNotificationsByDate(notifications);
    });
    
    // Play notification sound when new notifications arrive
    this.unreadCount$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      if (count > this.previousUnreadCount && this.notificationSoundEnabled) {
        this.playNotificationSound();
      }
      this.previousUnreadCount = count;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handles notification click - marks as read and navigates to relevant view
   */
  onNotificationClick(notification: Notification): void {
    // Mark as read
    if (!notification.isRead) {
      this.store.dispatch(NotificationActions.markAsRead({ id: notification.id }));
    }
    
    // Navigate to relevant view based on notification type
    this.navigateToNotificationTarget(notification);
  }

  /**
   * Marks all notifications as read
   */
  onMarkAllAsRead(): void {
    // TODO: Get current user ID from auth service
    this.store.dispatch(NotificationActions.markAllAsRead({ userId: 'current-user' }));
  }

  /**
   * Navigates to the relevant view based on notification type and data
   */
  private navigateToNotificationTarget(notification: Notification): void {
    // Parse notification data to determine navigation target
    const data = notification.data as any;
    
    switch (notification.type) {
      case 'job_assigned':
      case 'job_status_changed':
      case 'job_reassigned':
        if (data?.jobId) {
          this.router.navigate(['/field-resource-management/jobs', data.jobId]);
        }
        break;
        
      case 'certification_expiring':
        if (data?.technicianId) {
          this.router.navigate(['/field-resource-management/technicians', data.technicianId]);
        }
        break;
        
      case 'conflict_detected':
        this.router.navigate(['/field-resource-management/schedule/conflicts']);
        break;
        
      default:
        // If no specific navigation, go to dashboard
        this.router.navigate(['/field-resource-management/dashboard']);
        break;
    }
  }

  /**
   * Plays notification sound (optional, based on user preference)
   */
  private playNotificationSound(): void {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Failed to play notification sound', error);
    }
  }

  /**
   * Groups notifications by date (Today, Yesterday, Earlier)
   */
  private groupNotificationsByDate(notifications: Notification[]): { [key: string]: Notification[] } {
    const groups: { [key: string]: Notification[] } = {
      'Today': [],
      'Yesterday': [],
      'Earlier': []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt);
      notificationDate.setHours(0, 0, 0, 0);

      if (notificationDate.getTime() === today.getTime()) {
        groups['Today'].push(notification);
      } else if (notificationDate.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(notification);
      } else {
        groups['Earlier'].push(notification);
      }
    });

    return groups;
  }

  /**
   * Gets icon for notification type
   */
  getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'job_assigned': 'assignment',
      'job_status_changed': 'update',
      'job_reassigned': 'swap_horiz',
      'certification_expiring': 'warning',
      'conflict_detected': 'error',
      'default': 'notifications'
    };
    return iconMap[type] || iconMap['default'];
  }

  /**
   * Gets group keys that have notifications
   */
  getGroupKeys(): string[] {
    return Object.keys(this.groupedNotifications).filter(
      key => this.groupedNotifications[key].length > 0
    );
  }
  
  /**
   * Toggles notification sound preference
   */
  toggleNotificationSound(): void {
    this.notificationSoundEnabled = !this.notificationSoundEnabled;
    // TODO: Save preference to user settings
  }
}
