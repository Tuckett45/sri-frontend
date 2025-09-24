export type NotificationCategory = 'project' | 'alert' | 'reminder' | 'task';

export interface UserNotificationAction {
  readonly label: string;
  readonly routerLink?: string;
}

export interface UserNotification {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly category: NotificationCategory;
  readonly createdAt: Date;
  readonly read: boolean;
  readonly action?: UserNotificationAction;
}
