import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedNotificationService {
  // ─── In-app notification store ──────────────────────────────────────────────
  private notifications$ = new BehaviorSubject<AppNotification[]>([]);

  // ─── Snackbar defaults ──────────────────────────────────────────────────────
  private readonly defaultDuration = 4000;
  private readonly longDuration    = 7000;

  constructor(private snackBar: MatSnackBar) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Toast helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /** Show a green success snackbar. */
  success(message: string): void {
    this.openSnackBar(message, 'success-snackbar', this.defaultDuration);
  }

  /** Show a red error snackbar. */
  error(message: string): void {
    this.openSnackBar(message, 'error-snackbar', this.longDuration);
  }

  /** Show an amber warning snackbar. */
  warning(message: string): void {
    this.openSnackBar(message, 'warning-snackbar', this.longDuration);
  }

  /** Show a blue info snackbar. */
  info(message: string): void {
    this.openSnackBar(message, 'info-snackbar', this.defaultDuration);
  }

  /**
   * Show a snackbar with an action button.
   * @returns Observable that emits void when the action is clicked, then completes.
   */
  showWithAction(message: string, action: string): Observable<void> {
    const ref = this.snackBar.open(message, action, {
      duration:           this.longDuration,
      panelClass:         ['action-snackbar'],
      horizontalPosition: 'end',
      verticalPosition:   'top'
    });

    return ref.onAction() as Observable<void>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // In-app notification management
  // ═══════════════════════════════════════════════════════════════════════════

  /** Observable stream of all in-app notifications. */
  getNotifications(): Observable<AppNotification[]> {
    return this.notifications$.asObservable();
  }

  /** Observable count of unread in-app notifications. */
  getUnreadCount(): Observable<number> {
    return this.notifications$.pipe(
      map(notifications => notifications.filter(n => !n.read).length)
    );
  }

  /**
   * Add a new in-app notification to the queue.
   * A unique id is generated automatically if one is not supplied.
   */
  addNotification(
    notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'> &
                  Partial<Pick<AppNotification, 'id' | 'read' | 'createdAt'>>
  ): void {
    const entry: AppNotification = {
      id:        notification.id        ?? this.generateId(),
      read:      notification.read      ?? false,
      createdAt: notification.createdAt ?? new Date(),
      title:     notification.title,
      message:   notification.message,
      type:      notification.type,
      metadata:  notification.metadata
    };

    const current = this.notifications$.getValue();
    this.notifications$.next([entry, ...current]);
  }

  /**
   * Mark a single notification as read by its id.
   * Silently ignores unknown ids.
   */
  markAsRead(id: string): void {
    const updated = this.notifications$
      .getValue()
      .map(n => n.id === id ? { ...n, read: true } : n);
    this.notifications$.next(updated);
  }

  /** Mark all in-app notifications as read. */
  markAllAsRead(): void {
    const updated = this.notifications$
      .getValue()
      .map(n => ({ ...n, read: true }));
    this.notifications$.next(updated);
  }

  /** Remove all in-app notifications. */
  clearAll(): void {
    this.notifications$.next([]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private openSnackBar(
    message:    string,
    panelClass: string,
    duration:   number
  ): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass:         [panelClass],
      horizontalPosition: 'end',
      verticalPosition:   'top'
    };
    this.snackBar.open(message, 'Dismiss', config);
  }

  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
