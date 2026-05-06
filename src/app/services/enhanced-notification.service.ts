import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

@Injectable({ providedIn: 'root' })
export class EnhancedNotificationService {
  private notifications$ = new BehaviorSubject<AppNotification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private snackBar: MatSnackBar) {}

  getNotifications(): Observable<AppNotification[]> {
    return this.notifications$.asObservable();
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  success(title: string, message: string, action?: string): void {
    this.addNotification('success', title, message);
    this.showSnackBar(message, action || 'Dismiss', 'success-snackbar');
  }

  error(title: string, message: string, action?: string): void {
    this.addNotification('error', title, message);
    this.showSnackBar(message, action || 'Close', 'error-snackbar', 8000);
  }

  warning(title: string, message: string, action?: string): void {
    this.addNotification('warning', title, message);
    this.showSnackBar(message, action || 'OK', 'warning-snackbar', 5000);
  }

  info(title: string, message: string, action?: string): void {
    this.addNotification('info', title, message);
    this.showSnackBar(message, action || 'OK', 'info-snackbar');
  }

  markAllRead(): void {
    const notifications = this.notifications$.value.map(n => ({ ...n, read: true }));
    this.notifications$.next(notifications);
    this.unreadCount$.next(0);
  }

  markRead(id: string): void {
    const notifications = this.notifications$.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications$.next(notifications);
    this.updateUnreadCount();
  }

  clearAll(): void {
    this.notifications$.next([]);
    this.unreadCount$.next(0);
  }

  private addNotification(type: AppNotification['type'], title: string, message: string): void {
    const notification: AppNotification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    };
    const current = this.notifications$.value;
    this.notifications$.next([notification, ...current].slice(0, 50));
    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    const count = this.notifications$.value.filter(n => !n.read).length;
    this.unreadCount$.next(count);
  }

  private showSnackBar(message: string, action: string, panelClass: string, duration = 3000): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    };
    this.snackBar.open(message, action, config);
  }
}
