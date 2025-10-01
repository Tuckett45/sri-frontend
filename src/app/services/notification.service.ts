import { Injectable, Signal, computed, signal } from '@angular/core';
import { FeatureFlagService } from './feature-flag.service';
import {
  NotificationCategory,
  UserNotification,
  UserNotificationAction
} from '../models/notification.model';

interface AddNotificationOptions {
  readonly title: string;
  readonly message: string;
  readonly category: NotificationCategory;
  readonly action?: UserNotificationAction;
  readonly createdAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsFlag = this.featureFlagService.flagEnabled('notifications');

  private readonly notificationsState = signal<UserNotification[]>(this.seedNotifications());

  readonly notificationsEnabled = computed(() => this.notificationsFlag());

  readonly notifications: Signal<UserNotification[]> = computed(() => {
    if (!this.notificationsFlag()) {
      return [];
    }

    return [...this.notificationsState()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  });

  readonly unreadCount = computed(() => this.notifications().filter((note) => !note.read).length);

  constructor(private readonly featureFlagService: FeatureFlagService) {}

  addNotification(options: AddNotificationOptions): void {
    const notification: UserNotification = {
      id: this.generateId(),
      title: options.title,
      message: options.message,
      category: options.category,
      createdAt: options.createdAt ?? new Date(),
      read: false,
      action: options.action
    };

    this.notificationsState.update((current) => [notification, ...current]);
  }

  markAsRead(id: string): void {
    this.notificationsState.update((current) =>
      current.map((note) => (note.id === id ? { ...note, read: true } : note))
    );
  }

  markAsUnread(id: string): void {
    this.notificationsState.update((current) =>
      current.map((note) => (note.id === id ? { ...note, read: false } : note))
    );
  }

  markAllAsRead(): void {
    this.notificationsState.update((current) => current.map((note) => ({ ...note, read: true })));
  }

  private seedNotifications(): UserNotification[] {
    const now = new Date();
    return [
      {
        id: 'kickoff',
        title: 'Project kickoff complete',
        message: 'Fiber build kickoff tasks were closed out and the team can begin phase two.',
        category: 'project',
        createdAt: new Date(now.getTime() - 1000 * 60 * 30),
        read: false,
        action: {
          label: 'View overview',
          routerLink: '/overview'
        }
      },
      {
        id: 'field-update',
        title: 'New field update from construction',
        message: 'Market controller reported a supply chain delay for the Charlotte region.',
        category: 'alert',
        createdAt: new Date(now.getTime() - 1000 * 60 * 90),
        read: false,
        action: {
          label: 'Review tracker',
          routerLink: '/market-controller-tracker'
        }
      },
      {
        id: 'expense-due',
        title: 'Submit travel expenses',
        message: 'Upload last week’s travel receipts before Friday to keep reimbursements on time.',
        category: 'reminder',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5),
        read: true,
        action: {
          label: 'Open expenses',
          routerLink: '/expenses'
        }
      }
    ];
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return Math.random().toString(36).slice(2);
  }
}
