import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OfflineQueueService } from '../../../services/offline-queue.service';

/**
 * Offline Indicator Component
 * 
 * Displays the current online/offline status of the application.
 * Features:
 * - Real-time connectivity status detection
 * - Visual indicator with smooth transitions
 * - Accessible with ARIA labels
 * - Non-intrusive but clearly visible when offline
 * - Integrates with offline queue service
 * 
 * Requirements: 1.10.4, 4.4.5
 */
@Component({
  selector: 'app-offline-indicator',
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.scss']
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  isOnline: boolean = true;
  showIndicator: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(private offlineQueueService: OfflineQueueService) {}

  ngOnInit(): void {
    this.monitorConnectivity();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Monitor online/offline status changes
   */
  private monitorConnectivity(): void {
    // Set initial status
    this.isOnline = this.offlineQueueService.isCurrentlyOnline();
    this.showIndicator = !this.isOnline;

    // Listen to online event
    window.addEventListener('online', this.handleOnline);
    
    // Listen to offline event
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.isOnline = true;
    
    // Show "Back online" message briefly before hiding
    setTimeout(() => {
      this.showIndicator = false;
    }, 3000);
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.isOnline = false;
    this.showIndicator = true;
  };

  /**
   * Get status text for screen readers
   */
  getStatusText(): string {
    return this.isOnline 
      ? 'You are back online' 
      : 'You are currently offline. Changes will be synced when connection is restored.';
  }

  /**
   * Get icon name based on status
   */
  getIconName(): string {
    return this.isOnline ? 'cloud_done' : 'cloud_off';
  }

  /**
   * Get display text
   */
  getDisplayText(): string {
    return this.isOnline ? 'Back Online' : 'Offline Mode';
  }
}
