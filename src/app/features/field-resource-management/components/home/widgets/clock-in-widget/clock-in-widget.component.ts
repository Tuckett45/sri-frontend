import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, filter } from 'rxjs/operators';
import { selectAllAssignments } from '../../../../state/assignments/assignment.selectors';
import { selectJobEntities } from '../../../../state/jobs/job.selectors';
import {
  selectActiveTimeEntry,
  selectHasActiveEntry,
  selectTimeEntriesLoading,
  selectTimeEntriesError
} from '../../../../state/time-entries/time-entry.selectors';
import * as TimeEntryActions from '../../../../state/time-entries/time-entry.actions';
import { Assignment, AssignmentStatus } from '../../../../models/assignment.model';
import { Job } from '../../../../models/job.model';
import { TimeEntry, GeoLocation } from '../../../../models/time-entry.model';
import { GeolocationService } from '../../../../services/geolocation.service';
import { AuthService } from '../../../../../../services/auth.service';

export type ProximityStatus = 'On Site' | 'En Route' | 'Unknown';
export type ClockOutReason = 'end_of_day' | 'break' | 'lunch' | 'other';

@Component({
  selector: 'app-clock-in-widget',
  templateUrl: './clock-in-widget.component.html',
  styleUrls: ['./clock-in-widget.component.scss']
})
export class ClockInWidgetComponent implements OnInit, OnDestroy {
  activeJob$!: Observable<{ job: Job; assignment: Assignment } | null>;
  activeTimeEntry$!: Observable<TimeEntry | null>;
  isClockedIn$!: Observable<boolean>;
  loading$!: Observable<boolean>;
  storeError$!: Observable<string | null>;

  elapsedTime = '';
  proximityStatus: ProximityStatus = 'Unknown';
  locationError: string | null = null;
  checkingLocation = false;
  showClockOutOptions = false;

  private readonly MILE_IN_METERS = 1609.34;
  private currentTechnicianId = '';
  private destroy$ = new Subject<void>();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private store: Store,
    private geolocationService: GeolocationService,
    private authService: AuthService
  ) {
    this.currentTechnicianId = this.authService.getUser()?.id || '';
  }

  ngOnInit(): void {
    this.loading$ = this.store.select(selectTimeEntriesLoading);
    this.storeError$ = this.store.select(selectTimeEntriesError);
    this.isClockedIn$ = this.store.select(selectHasActiveEntry);
    this.activeTimeEntry$ = this.store.select(selectActiveTimeEntry);

    this.activeJob$ = combineLatest([
      this.store.select(selectAllAssignments),
      this.store.select(selectJobEntities)
    ]).pipe(
      map(([assignments, jobEntities]) => {
        const active = assignments.find(
          a => a.isActive && (a.status === AssignmentStatus.InProgress || a.status === AssignmentStatus.Accepted)
        );
        if (!active) return null;
        const job = jobEntities[active.jobId];
        if (!job) return null;
        return { job, assignment: active };
      })
    );

    this.activeTimeEntry$.pipe(takeUntil(this.destroy$)).subscribe(entry => {
      if (entry && !entry.clockOutTime) {
        this.startTimer(new Date(entry.clockInTime));
      } else {
        this.stopTimer();
        this.elapsedTime = '';
        this.proximityStatus = 'Unknown';
        this.showClockOutOptions = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
  }

  clockIn(job: Job): void {
    this.checkingLocation = true;
    this.locationError = null;

    this.geolocationService.getCurrentPosition(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location: GeoLocation) => {
          this.checkingLocation = false;
          this.updateProximity(location, job);
          this.store.dispatch(TimeEntryActions.clockIn({
            jobId: job.id,
            technicianId: this.currentTechnicianId,
            location
          }));
        },
        error: () => {
          this.checkingLocation = false;
          this.locationError = 'Location unavailable — clocking in without GPS';
          this.proximityStatus = 'Unknown';
          this.store.dispatch(TimeEntryActions.clockIn({
            jobId: job.id,
            technicianId: this.currentTechnicianId
          }));
        }
      });
  }

  toggleClockOutOptions(): void {
    this.showClockOutOptions = !this.showClockOutOptions;
  }

  clockOutWithReason(reason: ClockOutReason): void {
    this.showClockOutOptions = false;
    this.dispatchClockOut(reason);
  }

  private dispatchClockOut(reason: ClockOutReason): void {
    this.activeTimeEntry$.pipe(
      takeUntil(this.destroy$),
      filter((entry): entry is TimeEntry => entry !== null)
    ).subscribe(entry => {
      this.geolocationService.getCurrentPosition(true)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (location: GeoLocation) => {
            this.store.dispatch(TimeEntryActions.clockOut({
              timeEntryId: entry.id,
              location,
              reason
            }));
          },
          error: () => {
            this.store.dispatch(TimeEntryActions.clockOut({
              timeEntryId: entry.id,
              reason
            }));
          }
        });
    }).unsubscribe();
  }

  refreshLocation(job: Job): void {
    this.checkingLocation = true;
    this.locationError = null;

    this.geolocationService.getCurrentPosition(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location: GeoLocation) => {
          this.checkingLocation = false;
          this.updateProximity(location, job);
        },
        error: () => {
          this.checkingLocation = false;
          this.locationError = 'Unable to determine location';
          this.proximityStatus = 'Unknown';
        }
      });
  }

  private updateProximity(location: GeoLocation, job: Job): void {
    if (job.siteAddress?.latitude != null && job.siteAddress?.longitude != null) {
      const siteLocation: GeoLocation = {
        latitude: job.siteAddress.latitude,
        longitude: job.siteAddress.longitude,
        accuracy: 0
      };
      const distance = this.geolocationService.calculateDistance(location, siteLocation);
      this.proximityStatus = distance <= this.MILE_IN_METERS ? 'On Site' : 'En Route';
    } else {
      this.proximityStatus = 'Unknown';
    }
  }

  private startTimer(clockInTime: Date): void {
    this.stopTimer();
    const update = () => {
      const diff = Date.now() - clockInTime.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.elapsedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    update();
    this.timerInterval = setInterval(update, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
