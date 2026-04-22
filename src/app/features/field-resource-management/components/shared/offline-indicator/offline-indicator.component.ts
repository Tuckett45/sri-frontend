import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OfflineQueueService } from '../../../services/offline-queue.service';

/**
 * Offline Indicator Component
 * Displays offline status indicator in the header
 */
@Component({
  selector: 'app-offline-indicator',
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  isOnline = true;
  queuedActionsCount = 0;
  
  private destroy$ = new Subject<void>();

  constructor(private offlineQueueService: OfflineQueueService) {}

  ngOnInit(): void {
    // Monitor online status
    this.checkOnlineStatus();
    
    // Check every 5 seconds
    setInterval(() => {
      this.checkOnlineStatus();
    }, 5000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async checkOnlineStatus(): Promise<void> {
    this.isOnline = this.offlineQueueService.isCurrentlyOnline();
    
    if (!this.isOnline) {
      const queuedActions = await this.offlineQueueService.getQueuedActions();
      this.queuedActionsCount = queuedActions.length;
    } else {
      this.queuedActionsCount = 0;
    }
  }

  async syncNow(): Promise<void> {
    await this.offlineQueueService.syncQueuedActions();
    await this.checkOnlineStatus();
  }
}
