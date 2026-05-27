import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FrmSignalRService, LocationUpdate, JobStatusUpdate } from '../../../../services/frm-signalr.service';

export interface ActivityEvent {
  id: string;
  type: 'clock_in' | 'clock_out' | 'job_status' | 'location' | 'assignment' | 'timecard';
  icon: string;
  title: string;
  description: string;
  timestamp: Date;
  technicianName?: string;
  market?: string;
}

/**
 * Widget showing a live activity feed for managers/admin.
 * Receives events from SignalR in real-time:
 * - Technician clock-in/out
 * - Job status changes
 * - Timecard submissions
 * - Assignment responses
 */
@Component({
  selector: 'app-live-activity-feed-widget',
  templateUrl: './live-activity-feed-widget.component.html',
  styleUrls: ['./live-activity-feed-widget.component.scss']
})
export class LiveActivityFeedWidgetComponent implements OnInit, OnDestroy {
  @Input() marketFilter: string | null = null;
  @Input() maxEvents = 20;

  activityEvents: ActivityEvent[] = [];
  isConnected = false;

  private destroy$ = new Subject<void>();

  constructor(private signalRService: FrmSignalRService) {}

  ngOnInit(): void {
    this.subscribeToConnectionStatus();
    this.subscribeToEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(timestamp).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  trackEvent(index: number, event: ActivityEvent): string {
    return event.id;
  }

  private subscribeToConnectionStatus(): void {
    this.signalRService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.isConnected = status === 'connected';
      });
  }

  private subscribeToEvents(): void {
    // Job status changes
    this.signalRService.jobStatusChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event) {
          this.addEvent({
            id: crypto.randomUUID(),
            type: 'job_status',
            icon: 'update',
            title: `Job status: ${event.job?.status || 'updated'}`,
            description: event.job?.title || 'Job updated',
            timestamp: new Date()
          });
        }
      });

    // Location updates
    this.signalRService.locationUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event) {
          this.addEvent({
            id: crypto.randomUUID(),
            type: 'location',
            icon: 'location_on',
            title: 'Location update',
            description: `Technician ${event.technicianId.substring(0, 8)}... updated location`,
            timestamp: new Date(event.timestamp),
            technicianName: event.technicianId
          });
        }
      });

    // Notifications (includes clock-in/out, assignments, timecards)
    this.signalRService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        if (notification) {
          const eventType = this.resolveEventType(notification.type);
          this.addEvent({
            id: crypto.randomUUID(),
            type: eventType,
            icon: this.getEventIcon(eventType),
            title: notification.message || 'Activity',
            description: notification.message || '',
            timestamp: new Date(notification.createdAt || Date.now())
          });
        }
      });
  }

  private addEvent(event: ActivityEvent): void {
    // Apply market filter if set
    if (this.marketFilter && event.market && event.market !== this.marketFilter) {
      return;
    }

    this.activityEvents.unshift(event);
    if (this.activityEvents.length > this.maxEvents) {
      this.activityEvents.pop();
    }
  }

  private resolveEventType(type: string): ActivityEvent['type'] {
    if (type?.includes('clock_in')) return 'clock_in';
    if (type?.includes('clock_out')) return 'clock_out';
    if (type?.includes('job')) return 'job_status';
    if (type?.includes('timecard')) return 'timecard';
    if (type?.includes('assignment')) return 'assignment';
    return 'job_status';
  }

  private getEventIcon(type: ActivityEvent['type']): string {
    const icons: Record<string, string> = {
      'clock_in': 'login',
      'clock_out': 'logout',
      'job_status': 'update',
      'location': 'location_on',
      'assignment': 'assignment_ind',
      'timecard': 'receipt_long'
    };
    return icons[type] || 'info';
  }
}
