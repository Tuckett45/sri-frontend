import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-location-tracking-toggle',
  templateUrl: './location-tracking-toggle.component.html',
  styleUrls: ['./location-tracking-toggle.component.scss']
})
export class LocationTrackingToggleComponent implements OnInit, OnDestroy {
  trackingEnabled = false;
  trackingStatus: 'idle' | 'active' | 'denied' = 'idle';
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTracking(): void {
    if (this.trackingEnabled) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  }

  startTracking(): void {
    if (!navigator.geolocation) {
      this.trackingStatus = 'denied';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        this.trackingEnabled = true;
        this.trackingStatus = 'active';
      },
      () => {
        this.trackingStatus = 'denied';
      }
    );
  }

  stopTracking(): void {
    this.trackingEnabled = false;
    this.trackingStatus = 'idle';
  }
}
