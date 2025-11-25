import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { HubConnectionState } from '@microsoft/signalr';
import { DeploymentFeatureFlagsService } from '../../services/deployment-feature-flags.service';
import { DeploymentSignalRService } from '../../services/deployment-signalr.service';

@Component({
  selector: 'ark-deployment-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="deployment-settings">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>settings</mat-icon>
            Deployment Workflow Settings
          </mat-card-title>
          <mat-card-subtitle>
            Configure notifications and feature flags
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <!-- Notifications -->
          <div class="setting-item">
            <div class="setting-info">
              <h3>
                <mat-icon>notifications</mat-icon>
                Enable Notifications
              </h3>
              <p>Receive real-time updates via SignalR when deployments are assigned, ready for sign-off, have issues, or are completed.</p>
            </div>
            <mat-slide-toggle
              [(ngModel)]="flags.notificationsEnabled"
              (change)="onNotificationsToggle()"
              color="primary">
            </mat-slide-toggle>
          </div>

          <div class="connection-status" *ngIf="flags.notificationsEnabled">
            <span [class]="'status-indicator ' + connectionStatus">●</span>
            <span class="status-text">{{ connectionStatusText }}</span>
          </div>

          <!-- Auto-Assign -->
          <div class="setting-item">
            <div class="setting-info">
              <h3>
                <mat-icon>assignment_ind</mat-icon>
                Auto-Assign Deployments
              </h3>
              <p>Automatically assign deployments to users based on their role when phases change.</p>
            </div>
            <mat-slide-toggle
              [(ngModel)]="flags.autoAssignEnabled"
              (change)="onFlagChange('autoAssignEnabled')"
              color="primary">
            </mat-slide-toggle>
          </div>

          <!-- Role Colors -->
          <div class="setting-item">
            <div class="setting-info">
              <h3>
                <mat-icon>palette</mat-icon>
                Show Role Colors
              </h3>
              <p>Display color-coded indicators based on deployment runbook roles (Purple: DE, Blue: DC Ops, Green: Vendor, Black: SRI Tech).</p>
            </div>
            <mat-slide-toggle
              [(ngModel)]="flags.showRoleColors"
              (change)="onFlagChange('showRoleColors')"
              color="primary">
            </mat-slide-toggle>
          </div>

          <!-- Strict Role Enforcement -->
          <div class="setting-item">
            <div class="setting-info">
              <h3>
                <mat-icon>security</mat-icon>
                Strict Role Enforcement
              </h3>
              <p>Enforce strict role-based access control. Users can only access phases assigned to their role.</p>
            </div>
            <mat-slide-toggle
              [(ngModel)]="flags.strictRoleEnforcement"
              (change)="onFlagChange('strictRoleEnforcement')"
              color="warn"
              matTooltip="This may restrict access to certain phases">
            </mat-slide-toggle>
          </div>
        </mat-card-content>

        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="onSave()">
            <mat-icon>save</mat-icon>
            Save Settings
          </button>
          <button mat-button (click)="onReset()">
            <mat-icon>restore</mat-icon>
            Reset to Defaults
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Notification Center -->
      <mat-card *ngIf="flags.notificationsEnabled && notifications().length > 0">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>inbox</mat-icon>
            Recent Notifications
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="notification-list">
            <div *ngFor="let notification of notifications()" class="notification-item" [class]="'notification-' + notification.type">
              <div class="notification-icon">
                <mat-icon>{{ getNotificationIcon(notification.type) }}</mat-icon>
              </div>
              <div class="notification-content">
                <h4>{{ notification.deploymentName }}</h4>
                <p>{{ notification.message }}</p>
                <small>{{ formatTimestamp(notification.timestamp) }}</small>
              </div>
            </div>
          </div>

          <button mat-button color="warn" (click)="onClearNotifications()" *ngIf="notifications().length > 0">
            <mat-icon>delete_sweep</mat-icon>
            Clear All
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .deployment-settings {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    mat-card {
      margin-bottom: 24px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      margin-bottom: 8px;
    }

    mat-card-subtitle {
      color: #666;
      margin-bottom: 16px;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #eee;
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-info {
      flex: 1;
      padding-right: 16px;
    }

    .setting-info h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .setting-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-top: 12px;
    }

    .status-indicator {
      font-size: 12px;
      animation: pulse 2s infinite;
    }

    .status-indicator.connected {
      color: #4caf50;
    }

    .status-indicator.connecting {
      color: #ff9800;
    }

    .status-indicator.disconnected {
      color: #f44336;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-text {
      font-size: 14px;
      color: #666;
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      padding: 16px;
    }

    .notification-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-left: 4px solid #ccc;
      margin-bottom: 8px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .notification-item.notification-assigned {
      border-left-color: #2196f3;
    }

    .notification-item.notification-ready_for_signoff {
      border-left-color: #4caf50;
    }

    .notification-item.notification-issues {
      border-left-color: #ff9800;
    }

    .notification-item.notification-completed {
      border-left-color: #9c27b0;
    }

    .notification-icon mat-icon {
      color: #666;
    }

    .notification-content {
      flex: 1;
    }

    .notification-content h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .notification-content p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #666;
    }

    .notification-content small {
      font-size: 12px;
      color: #999;
    }
  `]
})
export class DeploymentSettingsComponent implements OnInit {
  private readonly flagsService = inject(DeploymentFeatureFlagsService);
  private readonly signalRService = inject(DeploymentSignalRService);
  private readonly toastr = inject(ToastrService);

  protected flags = this.flagsService.getFlags()();
  protected connectionStatus = 'disconnected';
  protected connectionStatusText = 'Disconnected';
  protected notifications = this.signalRService.getNotifications();

  ngOnInit(): void {
    this.updateConnectionStatus();
  }

  protected onNotificationsToggle(): void {
    if (this.flags.notificationsEnabled) {
      this.connectToSignalR();
    } else {
      this.disconnectFromSignalR();
    }
    this.onFlagChange('notificationsEnabled');
  }

  protected onFlagChange(key: keyof typeof this.flags): void {
    this.flagsService.setFlag(key as any, this.flags[key]);
    this.toastr.info(`Setting updated: ${this.getFlagLabel(key)}`, 'Settings');
  }

  protected onSave(): void {
    this.toastr.success('All settings have been saved', 'Settings Saved');
  }

  protected onReset(): void {
    this.flagsService.resetFlags();
    this.flags = this.flagsService.getFlags()();
    this.toastr.info('Settings have been reset to defaults', 'Reset');
  }

  protected onClearNotifications(): void {
    this.signalRService.clearNotifications();
    this.toastr.info('All notifications cleared', 'Notifications');
  }

  protected getNotificationIcon(type: string): string {
    switch (type) {
      case 'assigned': return 'assignment';
      case 'ready_for_signoff': return 'check_circle';
      case 'issues': return 'warning';
      case 'completed': return 'done_all';
      default: return 'notifications';
    }
  }

  protected formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  private async connectToSignalR(): Promise<void> {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        this.toastr.error('User not found. Please log in again.', 'Connection Failed');
        return;
      }

      const user = JSON.parse(userStr);
      await this.signalRService.connect(user.id);
      this.updateConnectionStatus();
      this.toastr.success('Connected to deployment notifications', 'Connected');
    } catch (error) {
      console.error('Failed to connect to SignalR:', error);
      this.toastr.error('Failed to connect to notification service', 'Connection Failed');
      this.updateConnectionStatus();
    }
  }

  private async disconnectFromSignalR(): Promise<void> {
    await this.signalRService.disconnect();
    this.updateConnectionStatus();
    this.toastr.info('Disconnected from deployment notifications', 'Disconnected');
  }

  private updateConnectionStatus(): void {
    const state = this.signalRService.getConnectionState()();
    
    switch (state) {
      case HubConnectionState.Connected:
        this.connectionStatus = 'connected';
        this.connectionStatusText = 'Connected to notification service';
        break;
      case HubConnectionState.Connecting:
      case HubConnectionState.Reconnecting:
        this.connectionStatus = 'connecting';
        this.connectionStatusText = 'Connecting to notification service...';
        break;
      default:
        this.connectionStatus = 'disconnected';
        this.connectionStatusText = 'Disconnected from notification service';
    }
  }

  private getFlagLabel(key: string): string {
    const labels: Record<string, string> = {
      notificationsEnabled: 'Notifications',
      autoAssignEnabled: 'Auto-Assign',
      strictRoleEnforcement: 'Strict Role Enforcement',
      showRoleColors: 'Role Colors'
    };
    return labels[key] || key;
  }
}

