import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  DeploymentNotification,
  DeploymentSignalRService
} from 'src/app/features/deployment/services/deployment-signalr.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { AuthService } from 'src/app/services/auth.service';
import { Magic8BallService, Magic8BallResponse } from 'src/app/services/magic-8-ball.service';
import { NotificationPreferencesService } from 'src/app/services/notification-preferences.service';
import { NotificationIntegratorService } from 'src/app/services/notification-integrator.service';
import { DeploymentPushNotificationService } from 'src/app/features/deployment/services/deployment-push-notification.service';
import { NotificationApiService, NotificationDto } from 'src/app/features/field-resource-management/services/notification-api.service';
import { FrmSignalRService } from 'src/app/features/field-resource-management/services/frm-signalr.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

type NotificationCategory = 'assignment' | 'signoff' | 'issue' | 'status' | 'general' | 'workforce' | 'timecard';

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

/**
 * User Notifications Component
 * 
 * This component provides a comprehensive notification interface that includes:
 * - Deployment notifications via SignalR
 * - Magic 8 Ball interactive feature with notification support
 * - Notification preference management
 * - Push notification permission handling
 * - Read/unread notification tracking
 * 
 * The component integrates with multiple services to provide a unified
 * notification experience across different notification types.
 */
@Component({
  selector: 'app-user-notifications',
  templateUrl: './user-notifications.component.html',
  styleUrls: ['./user-notifications.component.scss'],
  standalone: false
})
export class UserNotificationsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly featureFlags = inject(FeatureFlagService);
  private readonly signalRService = inject(DeploymentSignalRService);
  private readonly magic8Ball = inject(Magic8BallService);
  private readonly notificationPreferences = inject(NotificationPreferencesService);
  private readonly notificationIntegrator = inject(NotificationIntegratorService);
  private readonly pushService = inject(DeploymentPushNotificationService);
  private readonly notificationApi = inject(NotificationApiService);
  private readonly frmSignalR = inject(FrmSignalRService);
  private readonly fb = inject(FormBuilder);
  private readonly READ_STORAGE_KEY = 'sri-notifications-read-ids';
  private readonly destroy$ = new Subject<void>();

  private readonly readIds = signal<Set<string>>(this.loadReadState());

  // Magic 8 Ball properties
  protected readonly magic8BallForm: FormGroup;
  protected readonly isShaking = signal(false);
  protected readonly currentResponse = signal<Magic8BallResponse | null>(null);
  protected readonly responseHistory = signal<Magic8BallResponse[]>([]);
  
  // Permission handling
  protected readonly permissionStatus = signal<NotificationPermission>('default');
  protected readonly showPermissionEducation = signal(false);
  protected readonly isRequestingPermission = signal(false);

  // Deployment notifications (existing)
  protected readonly notifications = this.signalRService.getNotifications();
  protected readonly notificationsEnabled = this.featureFlags.flagEnabled('notifications');

  // Workforce notifications (NEW - from /v1/notifications API)
  protected readonly workforceNotifications = signal<NotificationDto[]>([]);
  protected readonly workforceLoading = signal(false);
  protected readonly workforceUnreadCount = signal(0);

  private readonly viewModels = computed<NotificationViewModel[]>(() =>
    this.notifications().map((notification) => this.toViewModel(notification))
  );

  protected readonly unreadNotifications = computed<NotificationViewModel[]>(() =>
    this.viewModels().filter((notification) => !this.isNotificationRead(notification.id))
  );

  protected readonly readNotifications = computed<NotificationViewModel[]>(() =>
    this.viewModels().filter((notification) => this.isNotificationRead(notification.id))
  );

  constructor() {
    // Load Magic 8 Ball preferences
    const magic8BallPrefs = this.notificationPreferences.getPreferences('magic-8-ball');

    // Initialize Magic 8 Ball form with loaded preferences
    this.magic8BallForm = this.fb.group({
      question: ['', [Validators.required, Validators.minLength(3)]],
      showToast: [magic8BallPrefs.toastEnabled],
      sendPush: [magic8BallPrefs.pushEnabled],
      toastType: [magic8BallPrefs.defaultToastType]
    });

    // Subscribe to form changes to save preferences
    this.magic8BallForm.valueChanges.subscribe((formValue) => {
      this.savePreferences(formValue);
    });
    
    // Subscribe to sendPush changes to handle permission requests
    this.magic8BallForm.get('sendPush')?.valueChanges.subscribe((enabled) => {
      if (enabled) {
        this.handlePushNotificationToggle();
      }
    });
    
    // Update permission status
    this.updatePermissionStatus();
  }

  async ngOnInit(): Promise<void> {
    if (!this.notificationsEnabled()) {
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      console.warn('⚠️ Unable to determine user id for notifications.');
      return;
    }

    try {
      await this.signalRService.connect(userId);
      console.log('✅ SignalR notifications initialized');
    } catch (error) {
      console.warn('⚠️ SignalR connection failed - continuing without real-time notifications:', error);
    }

    // Load workforce notifications from the API
    this.loadWorkforceNotifications(userId);

    // Subscribe to real-time FRM notifications
    this.frmSignalR.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        if (notification) {
          // Convert FRM notification to NotificationDto and prepend
          const dto: NotificationDto = {
            id: notification.id || crypto.randomUUID(),
            userId: userId,
            title: notification.message,
            message: notification.message,
            type: notification.type?.toString() || 'general',
            priority: 'normal',
            channels: 'in-app',
            status: 'sent',
            createdAt: new Date(notification.createdAt || Date.now()).toISOString(),
            relatedEntityType: notification.relatedEntityType,
            relatedEntityId: notification.relatedEntityId
          };
          const current = this.workforceNotifications();
          this.workforceNotifications.set([dto, ...current.slice(0, 49)]);
          this.workforceUnreadCount.update(c => c + 1);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load workforce notifications from the /v1/notifications/my endpoint
   */
  private loadWorkforceNotifications(userId: string): void {
    this.workforceLoading.set(true);
    this.notificationApi.getMyNotifications(userId, { pageSize: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.workforceNotifications.set(result.items);
          this.workforceUnreadCount.set(result.unreadCount);
          this.workforceLoading.set(false);
        },
        error: (err) => {
          console.warn('Failed to load workforce notifications:', err);
          this.workforceLoading.set(false);
        }
      });
  }

  /**
   * Mark a workforce notification as read via the API
   */
  protected markWorkforceAsRead(notification: NotificationDto): void {
    if (notification.readAt) return;
    this.notificationApi.markAsRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const updated = this.workforceNotifications().map(n =>
          n.id === notification.id ? { ...n, readAt: new Date().toISOString(), status: 'read' as const } : n
        );
        this.workforceNotifications.set(updated);
        this.workforceUnreadCount.update(c => Math.max(0, c - 1));
      });
  }

  /**
   * Mark all workforce notifications as read
   */
  protected markAllWorkforceAsRead(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    this.notificationApi.markAllAsRead(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const now = new Date().toISOString();
        const updated = this.workforceNotifications().map(n => ({ ...n, readAt: now, status: 'read' as const }));
        this.workforceNotifications.set(updated);
        this.workforceUnreadCount.set(0);
      });
  }

  /**
   * Navigate to the related entity from a workforce notification
   */
  protected goToWorkforceAction(notification: NotificationDto): void {
    this.markWorkforceAsRead(notification);
    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    } else if (notification.relatedEntityType === 'job' && notification.relatedEntityId) {
      this.router.navigate(['/field-resource-management/jobs', notification.relatedEntityId]);
    } else if (notification.relatedEntityType === 'timeEntry' && notification.relatedEntityId) {
      this.router.navigate(['/field-resource-management/timecard']);
    }
  }

  /**
   * Get icon for workforce notification type
   */
  protected getWorkforceIcon(type: string): string {
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

  /**
   * Get category for workforce notification (for tag styling)
   */
  protected getWorkforceCategory(type: string): NotificationCategory {
    if (type.includes('timecard')) return 'timecard';
    if (type.includes('job') || type.includes('clock')) return 'workforce';
    if (type.includes('assignment')) return 'assignment';
    return 'general';
  }

  /**
   * Combined total unread count across both notification sources
   */
  protected totalUnreadCount(): number {
    return this.unreadCount() + this.workforceUnreadCount();
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
      case 'workforce':
        return 'info';
      case 'timecard':
        return 'warn';
      default:
        return 'contrast';
    }
  }

  protected trackByWorkforceId(_: number, notification: NotificationDto): string {
    return notification.id;
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

  /**
   * Save Magic 8 Ball notification preferences to localStorage
   * Only saves preference-related fields (toast/push enabled, toast type)
   * Does not save the question text
   */
  private savePreferences(formValue: any): void {
    // Only save preference-related fields, not the question
    this.notificationPreferences.updatePreferences('magic-8-ball', {
      toastEnabled: formValue.showToast,
      pushEnabled: formValue.sendPush,
      defaultToastType: formValue.toastType
    });
  }

  /**
   * Handle Magic 8 Ball question submission
   * Validates form, starts shaking animation, and sends notifications
   * based on user preferences
   */
  protected onAskQuestion(): void {
    if (this.magic8BallForm.invalid) {
      return;
    }

    const formValue = this.magic8BallForm.value;
    const question = formValue.question.trim();
    
    if (!question) {
      return;
    }

    // Start shaking animation
    this.isShaking.set(true);

    const options = {
      showToast: formValue.showToast,
      sendPush: formValue.sendPush,
      toastType: formValue.toastType
    };

    // Ask the Magic 8 Ball
    this.magic8Ball.askQuestion(question, options).subscribe({
      next: (response) => {
        // Stop shaking and show response
        this.isShaking.set(false);
        this.currentResponse.set(response);
        
        // Add to history
        const history = this.responseHistory();
        this.responseHistory.set([response, ...history.slice(0, 4)]); // Keep last 5
        
        // Clear the question form
        this.magic8BallForm.patchValue({ question: '' });
      },
      error: (error) => {
        console.error('Magic 8 Ball error:', error);
        this.isShaking.set(false);
      }
    });
  }

  /**
   * Clear Magic 8 Ball response history
   */
  protected onClearHistory(): void {
    this.responseHistory.set([]);
    this.currentResponse.set(null);
  }

  /**
   * Ask the same question again
   * Populates the form with the previous question and submits it
   */
  protected onAskAgain(): void {
    if (this.currentResponse()) {
      this.magic8BallForm.patchValue({ 
        question: this.currentResponse()!.question 
      });
      this.onAskQuestion();
    }
  }

  /**
   * Get CSS class for Magic 8 Ball response based on category
   * @param category - The response category (positive, negative, neutral)
   * @returns CSS class name for styling
   */
  protected getResponseClass(category: Magic8BallResponse['category']): string {
    switch (category) {
      case 'positive': return 'response-positive';
      case 'negative': return 'response-negative';
      case 'neutral': return 'response-neutral';
      default: return '';
    }
  }

  /**
   * Get emoji icon for Magic 8 Ball response based on category
   * @param category - The response category (positive, negative, neutral)
   * @returns Emoji string for display
   */
  protected getResponseIcon(category: Magic8BallResponse['category']): string {
    switch (category) {
      case 'positive': return '✅';
      case 'negative': return '❌';
      case 'neutral': return '🤔';
      default: return '🎱';
    }
  }

  /**
   * Track by function for Magic 8 Ball response history
   * Uses timestamp as unique identifier for Angular change detection
   */
  protected trackByTimestamp(_index: number, response: Magic8BallResponse): string {
    return response.timestamp.toISOString();
  }
  
  // Permission handling methods
  
  /**
   * Update the current permission status
   */
  private updatePermissionStatus(): void {
    if (this.pushService.isSupported()) {
      this.permissionStatus.set(this.pushService.permission);
    } else {
      this.permissionStatus.set('denied');
    }
  }
  
  /**
   * Handle push notification toggle
   * Request permission if not granted
   */
  private async handlePushNotificationToggle(): Promise<void> {
    // Check if push notifications are supported
    if (!this.pushService.isSupported()) {
      this.showPermissionEducation.set(true);
      this.magic8BallForm.patchValue({ sendPush: false }, { emitEvent: false });
      return;
    }
    
    // Check current permission status
    const currentPermission = this.pushService.permission;
    
    if (currentPermission === 'granted') {
      // Permission already granted, initialize subscription if needed
      await this.initializePushSubscription();
      return;
    }
    
    if (currentPermission === 'denied') {
      // Permission was denied, show educational message
      this.showPermissionEducation.set(true);
      this.magic8BallForm.patchValue({ sendPush: false }, { emitEvent: false });
      return;
    }
    
    // Permission is 'default', request it
    await this.requestNotificationPermission();
  }
  
  /**
   * Request notification permission from the browser
   */
  protected async requestNotificationPermission(): Promise<void> {
    if (this.isRequestingPermission()) {
      return;
    }
    
    this.isRequestingPermission.set(true);
    
    try {
      const permission = await this.notificationIntegrator.requestPermissions();
      this.permissionStatus.set(permission);
      
      if (permission === 'granted') {
        // Permission granted, initialize push subscription
        await this.initializePushSubscription();
        this.showPermissionEducation.set(false);
      } else if (permission === 'denied') {
        // Permission denied, show educational message
        this.showPermissionEducation.set(true);
        this.magic8BallForm.patchValue({ sendPush: false }, { emitEvent: false });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      this.showPermissionEducation.set(true);
      this.magic8BallForm.patchValue({ sendPush: false }, { emitEvent: false });
    } finally {
      this.isRequestingPermission.set(false);
    }
  }
  
  /**
   * Initialize push notification subscription after permission is granted
   */
  private async initializePushSubscription(): Promise<void> {
    try {
      await this.pushService.initialize();
      console.log('✅ Push notification subscription initialized');
    } catch (error) {
      console.error('❌ Failed to initialize push subscription:', error);
    }
  }
  
  /**
   * Dismiss the permission education message
   */
  protected dismissPermissionEducation(): void {
    this.showPermissionEducation.set(false);
  }
  
  /**
   * Check if push notifications are supported
   */
  protected isPushSupported(): boolean {
    return this.pushService.isSupported();
  }
  
  /**
   * Get permission status display text
   */
  protected getPermissionStatusText(): string {
    const status = this.permissionStatus();
    switch (status) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Blocked';
      default:
        return 'Not set';
    }
  }
  
  /**
   * Get permission status severity for UI styling
   */
  protected getPermissionStatusSeverity(): 'success' | 'danger' | 'warn' {
    const status = this.permissionStatus();
    switch (status) {
      case 'granted':
        return 'success';
      case 'denied':
        return 'danger';
      default:
        return 'warn';
    }
  }
}
