import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  DeploymentNotification,
  DeploymentSignalRService
} from 'src/app/features/deployment/services/deployment-signalr.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { AuthService } from 'src/app/services/auth.service';

type NotificationCategory = 'assignment' | 'signoff' | 'issue' | 'status' | 'general';

interface NotificationAction {
  readonly label: string;
  readonly commands: any[];
}

interface NotificationViewModel {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly category: NotificationCategory;
  readonly priority: DeploymentNotification['priority'];
  readonly action?: NotificationAction;
  readonly raw: DeploymentNotification;
}

@Component({
  selector: 'app-user-notifications',
  templateUrl: './user-notifications.component.html',
  styleUrls: ['./user-notifications.component.scss'],
  standalone: false
})
export class UserNotificationsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly featureFlags = inject(FeatureFlagService);
  private readonly signalRService = inject(DeploymentSignalRService);
  private readonly READ_STORAGE_KEY = 'sri-notifications-read-ids';

  private readonly readIds = signal<Set<string>>(this.loadReadState());

  protected readonly notifications = this.signalRService.getNotifications();
  protected readonly notificationsEnabled = this.featureFlags.flagEnabled('notifications');

  private readonly viewModels = computed<NotificationViewModel[]>(() =>
    this.notifications().map((notification) => this.toViewModel(notification))
  );

  protected readonly unreadNotifications = computed<NotificationViewModel[]>(() =>
    this.viewModels().filter((notification) => !this.isNotificationRead(notification.id))
  );

  protected readonly readNotifications = computed<NotificationViewModel[]>(() =>
    this.viewModels().filter((notification) => this.isNotificationRead(notification.id))
  );

  async ngOnInit(): Promise<void> {
    if (!this.notificationsEnabled()) {
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      console.warn('Unable to determine user id for notifications.');
      return;
    }

    try {
      await this.signalRService.connect(userId);
    } catch (error) {
      console.error('Failed to connect to deployment notification hub:', error);
    }
  }

  protected unreadCount(): number {
    return this.unreadNotifications().length;
  }

  protected markAsRead(notification: NotificationViewModel): void {
    this.updateReadState(notification.id, true);
  }

  protected markAsUnread(notification: NotificationViewModel): void {
    this.updateReadState(notification.id, false);
  }

  protected markAllAsRead(): void {
    const next = new Set(this.readIds());
    this.viewModels().forEach((notification) => next.add(notification.id));
    this.setReadIds(next);
  }

  protected goToAction(notification: NotificationViewModel): void {
    if (!notification.action) {
      return;
    }

    this.router.navigate(notification.action.commands).then((navigated) => {
      if (navigated) {
        this.markAsRead(notification);
      }
    });
  }

  protected trackByNotificationId(_: number, notification: NotificationViewModel): string {
    return notification.id;
  }

  protected tagSeverity(category: NotificationCategory): 'info' | 'success' | 'warn' | 'danger' | 'contrast' {
    switch (category) {
      case 'assignment':
        return 'info';
      case 'signoff':
        return 'warn';
      case 'issue':
        return 'danger';
      case 'status':
        return 'success';
      default:
        return 'contrast';
    }
  }

  protected notificationsAvailable(): boolean {
    return this.viewModels().length > 0;
  }

  private isNotificationRead(id: string): boolean {
    return this.readIds().has(id);
  }

  private updateReadState(id: string, read: boolean): void {
    const next = new Set(this.readIds());
    if (read) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.setReadIds(next);
  }

  private setReadIds(next: Set<string>): void {
    this.readIds.set(next);
    this.persistReadState(next);
  }

  private toViewModel(notification: DeploymentNotification): NotificationViewModel {
    const timestamp = notification.timestamp ? new Date(notification.timestamp) : new Date();
    const id = this.buildNotificationId(notification, timestamp);
    const category = this.resolveCategory(notification.type);

    return {
      id,
      title: this.resolveTitle(notification),
      message: notification.message || 'No additional details were included with this notification.',
      timestamp,
      category,
      priority: notification.priority ?? 'medium',
      action: this.resolveAction(notification),
      raw: notification
    };
  }

  private resolveCategory(type: DeploymentNotification['type']): NotificationCategory {
    switch (type) {
      case 'assigned':
        return 'assignment';
      case 'ready_for_signoff':
      case 'signoff_recorded':
        return 'signoff';
      case 'issues':
      case 'issue_created':
      case 'issue_updated':
      case 'issue_resolved':
        return 'issue';
      case 'completed':
      case 'phase_advanced':
      case 'evidence_added':
        return 'status';
      default:
        return 'general';
    }
  }

  private resolveTitle(notification: DeploymentNotification): string {
    switch (notification.type) {
      case 'assigned':
        return 'Deployment Assigned';
      case 'ready_for_signoff':
        return 'Sign-Off Required';
      case 'signoff_recorded':
        return 'Sign-Off Recorded';
      case 'completed':
        return 'Deployment Complete';
      case 'issue_created':
        return 'New Issue Reported';
      case 'issue_updated':
        return 'Issue Updated';
      case 'issue_resolved':
        return 'Issue Resolved';
      case 'phase_advanced':
        return 'Phase Advanced';
      case 'evidence_added':
        return 'Evidence Added';
      case 'issues':
        return 'Deployment Issue';
      default:
        return 'Deployment Update';
    }
  }

  private resolveAction(notification: DeploymentNotification): NotificationAction | undefined {
    if (!notification.deploymentId) {
      return undefined;
    }

    const route =
      notification.type === 'issues' ||
      notification.type === 'issue_created' ||
      notification.type === 'issue_updated'
        ? ['/deployments', notification.deploymentId, 'issues']
        : ['/deployments', notification.deploymentId];

    return {
      label: 'View deployment',
      commands: route
    };
  }

  private buildNotificationId(notification: DeploymentNotification, timestamp: Date): string {
    const base = notification.deploymentId ?? 'general';
    const messageFragment = notification.message?.slice(0, 16) ?? 'msg';
    return `${base}:${notification.type}:${timestamp.getTime()}:${messageFragment}`;
  }

  private getCurrentUserId(): string | null {
    const user = this.authService.getUser();
    if (user?.id) {
      return user.id;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = window.localStorage.getItem('user');
      if (!stored) {
        return null;
      }
      const parsed = JSON.parse(stored);
      return parsed?.id ?? null;
    } catch {
      return null;
    }
  }

  private loadReadState(): Set<string> {
    if (typeof window === 'undefined') {
      return new Set<string>();
    }

    try {
      const raw = window.localStorage.getItem(this.READ_STORAGE_KEY);
      if (!raw) {
        return new Set<string>();
      }
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed);
    } catch {
      return new Set<string>();
    }
  }

  private persistReadState(state: Set<string>): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(Array.from(state));
      window.localStorage.setItem(this.READ_STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('Failed to persist notification read state:', error);
    }
  }
}
