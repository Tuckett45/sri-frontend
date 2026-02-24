import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TimeEntry, GeoLocation } from '../../../models/time-entry.model';
import { Job } from '../../../models/job.model';
import * as TimeEntryActions from '../../../state/time-entries/time-entry.actions';
import * as TimeEntrySelectors from '../../../state/time-entries/time-entry.selectors';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { AccessibilityService } from '../../../services/accessibility.service';
import { GeolocationService } from '../../../services/geolocation.service';
import { GeocodingService } from '../../../../../services/geocoding.service';

/**
 * Timecard Dashboard Component
 * 
 * Displays comprehensive time tracking overview for the current user:
 * - Active time entry with live timer
 * - Today's time entries summary
 * - Weekly time entries with totals
 * - Mileage tracking
 * - Quick actions for clock in/out
 */
@Component({
  selector: 'frm-timecard-dashboard',
  templateUrl: './timecard-dashboard.component.html',
  styleUrls: ['./timecard-dashboard.component.scss']
})
export class TimecardDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Current user (mock - would come from auth service)
  currentTechnicianId = 'current-technician-id';
  
  // Observable data streams
  activeTimeEntry$: Observable<TimeEntry | null>;
  todayTimeEntries$: Observable<TimeEntry[]>;
  todayTimeEntriesData: TimeEntry[] = [];
  weekTimeEntries$: Observable<TimeEntry[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Jobs for start time entry
  jobs$: Observable<Job[]>;
  selectedJobId: string | null = null;
  
  // Computed values
  todayTotalHours = 0;
  todayTotalMileage = 0;
  weekTotalHours = 0;
  weekTotalMileage = 0;
  
  // Active job for time tracker
  activeJob: Job | null = null;
  
  // Date range for filtering
  selectedDate = new Date();
  weekStart = new Date();
  weekEnd = new Date();
  
  // Cache for reverse geocoded addresses
  private addressCache: Map<string, string> = new Map();
  
  constructor(
    private store: Store,
    private accessibilityService: AccessibilityService,
    private geolocationService: GeolocationService,
    private geocodingService: GeocodingService
  ) {
    // Initialize observables
    this.activeTimeEntry$ = this.store.select(TimeEntrySelectors.selectActiveTimeEntry);
    this.todayTimeEntries$ = this.store.select(TimeEntrySelectors.selectTodayTimeEntries);
    this.weekTimeEntries$ = this.store.select(TimeEntrySelectors.selectWeekTimeEntries);
    this.loading$ = this.store.select(TimeEntrySelectors.selectTimeEntryLoading);
    this.error$ = this.store.select(TimeEntrySelectors.selectTimeEntryError);
    this.jobs$ = this.store.select(JobSelectors.selectAllJobs);
    
    // Calculate week range
    this.calculateWeekRange();
  }
  
  ngOnInit(): void {
    // Load time entries for current user
    this.loadTimeEntries();
    
    // Subscribe to active time entry to get active job
    this.activeTimeEntry$.pipe(takeUntil(this.destroy$)).subscribe(entry => {
      if (entry) {
        this.loadActiveJob(entry.jobId);
      } else {
        this.activeJob = null;
      }
    });
    
    // Subscribe to today's entries for calculations
    this.todayTimeEntries$.pipe(takeUntil(this.destroy$)).subscribe(entries => {
      this.todayTimeEntriesData = entries;
      this.calculateTodayTotals(entries);
    });
    
    // Subscribe to week entries for calculations
    this.weekTimeEntries$.pipe(takeUntil(this.destroy$)).subscribe(entries => {
      this.calculateWeekTotals(entries);
    });
    
    // Subscribe to loading state for announcements
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      if (loading) {
        this.accessibilityService.announce('Loading timecard data');
      }
    });
    
    // Subscribe to error state for announcements
    this.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      if (error) {
        this.accessibilityService.announceError(error);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load time entries
   */
  loadTimeEntries(): void {
    this.store.dispatch(TimeEntryActions.loadTimeEntries({
      technicianId: this.currentTechnicianId
    }));
  }
  
  /**
   * Load active job details
   */
  loadActiveJob(jobId: string): void {
    this.store.select(JobSelectors.selectJobById(jobId))
      .pipe(takeUntil(this.destroy$))
      .subscribe(job => {
        this.activeJob = job || null;
      });
  }
  
  /**
   * Calculate week range (Monday to Sunday)
   */
  calculateWeekRange(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
    
    this.weekStart = new Date(today);
    this.weekStart.setDate(today.getDate() + diff);
    this.weekStart.setHours(0, 0, 0, 0);
    
    this.weekEnd = new Date(this.weekStart);
    this.weekEnd.setDate(this.weekStart.getDate() + 6);
    this.weekEnd.setHours(23, 59, 59, 999);
  }
  
  /**
   * Calculate today's totals
   */
  calculateTodayTotals(entries: TimeEntry[]): void {
    this.todayTotalHours = entries.reduce((sum, entry) => {
      return sum + this.calculateHours(entry);
    }, 0);
    
    this.todayTotalMileage = entries.reduce((sum, entry) => {
      return sum + (entry.mileage || 0);
    }, 0);
  }
  
  /**
   * Calculate week totals
   */
  calculateWeekTotals(entries: TimeEntry[]): void {
    this.weekTotalHours = entries.reduce((sum, entry) => {
      return sum + this.calculateHours(entry);
    }, 0);
    
    this.weekTotalMileage = entries.reduce((sum, entry) => {
      return sum + (entry.mileage || 0);
    }, 0);
  }
  
  /**
   * Calculate hours for a time entry
   */
  calculateHours(entry: TimeEntry): number {
    if (!entry.clockInTime) return 0;
    
    const clockIn = new Date(entry.clockInTime).getTime();
    const clockOut = entry.clockOutTime 
      ? new Date(entry.clockOutTime).getTime() 
      : Date.now();
    
    const diffMs = clockOut - clockIn;
    return diffMs / (1000 * 60 * 60); // Convert to hours
  }
  
  /**
   * Format hours for display
   */
  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  }
  
  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  /**
   * Format time for display
   */
  formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  }
  
  /**
   * Get job name for time entry
   */
  getJobName(entry: TimeEntry): Observable<string> {
    return new Observable(observer => {
      this.store.select(JobSelectors.selectJobById(entry.jobId))
        .pipe(takeUntil(this.destroy$))
        .subscribe(job => {
          observer.next(job ? `${job.jobId} - ${job.client}` : 'Unknown Job');
        });
    });
  }
  
  /**
   * Refresh data
   */
  onRefresh(): void {
    this.loadTimeEntries();
    this.accessibilityService.announce('Timecard data refreshed');
  }
  
  /**
   * Navigate to previous week
   */
  previousWeek(): void {
    this.weekStart.setDate(this.weekStart.getDate() - 7);
    this.weekEnd.setDate(this.weekEnd.getDate() - 7);
    this.loadTimeEntries();
  }
  
  /**
   * Navigate to next week
   */
  nextWeek(): void {
    this.weekStart.setDate(this.weekStart.getDate() + 7);
    this.weekEnd.setDate(this.weekEnd.getDate() + 7);
    this.loadTimeEntries();
  }
  
  /**
   * Navigate to current week
   */
  currentWeek(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday
    
    this.weekStart = new Date(today);
    this.weekStart.setDate(today.getDate() + diff);
    this.weekStart.setHours(0, 0, 0, 0);
    
    this.weekEnd = new Date(this.weekStart);
    this.weekEnd.setDate(this.weekStart.getDate() + 6);
    this.weekEnd.setHours(23, 59, 59, 999);
    
    this.loadTimeEntries();
  }
  
  /**
   * Select a job for time entry
   */
  selectJob(jobId: string): void {
    this.selectedJobId = jobId;
    this.accessibilityService.announce('Job selected');
  }
  
  /**
   * Start time entry (clock in)
   */
  async startTimeEntry(): Promise<void> {
    if (!this.selectedJobId) {
      this.accessibilityService.announceError('Please select a job to start time entry');
      return;
    }

    try {
      // Attempt to capture current location
      const location = await this.captureLocation();

      // Dispatch clock in with location (mileage will be calculated on clock out)
      this.store.dispatch(TimeEntryActions.clockIn({
        jobId: this.selectedJobId,
        technicianId: this.currentTechnicianId,
        location
      }));

      this.accessibilityService.announce('Time entry started successfully with location captured');
    } catch (error) {
      // Still allow clock in without location
      this.store.dispatch(TimeEntryActions.clockIn({
        jobId: this.selectedJobId,
        technicianId: this.currentTechnicianId
      }));

      this.accessibilityService.announce('Time entry started (location unavailable)');
    }

    this.selectedJobId = null;
  }
  
  /**
   * Capture current location
   */
  private captureLocation(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      this.geolocationService.getCurrentPositionWithFallback().subscribe({
        next: (location) => resolve(location),
        error: (error) => reject(error)
      });
    });
  }
  
  /**
   * Format address for display
   */
  formatAddress(address: any): string {
    if (!address) return 'No address';
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
  }
  
  /**
   * Format geolocation for display
   */
  formatLocation(location: any): string {
    if (!location) return 'Location not available';
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }
  
  /**
   * Get Google Maps link for a location
   */
  getGoogleMapsLink(location: any): string {
    if (!location) return '#';
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  }
  
  /**
   * Get human-readable address from coordinates using reverse geocoding
   */
  getLocationAddress(location: any): string {
    if (!location) return 'Location not available';
    
    const cacheKey = `${location.latitude},${location.longitude}`;
    
    // Check cache first
    if (this.addressCache.has(cacheKey)) {
      return this.addressCache.get(cacheKey)!;
    }
    
    // Set loading placeholder
    const loadingText = 'Loading address...';
    this.addressCache.set(cacheKey, loadingText);
    
    // Fetch address asynchronously
    this.geocodingService.reverseGeocode(location.latitude, location.longitude)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'OK' && response.results && response.results.length > 0) {
            const result = response.results[0];
            // Get the formatted address or construct from components
            const address = result.formatted_address || this.formatGeocodingResult(result);
            this.addressCache.set(cacheKey, address);
          } else {
            this.addressCache.set(cacheKey, 'Address not found');
          }
        },
        error: (error) => {
          console.error('Reverse geocoding failed:', error);
          this.addressCache.set(cacheKey, 'Address unavailable');
        }
      });
    
    return loadingText;
  }
  
  /**
   * Format geocoding result into readable address
   */
  private formatGeocodingResult(result: any): string {
    const components = result.address_components || [];
    let street = '';
    let city = '';
    let state = '';
    
    components.forEach((component: any) => {
      if (component.types.includes('street_number') || component.types.includes('route')) {
        street += component.short_name + ' ';
      } else if (component.types.includes('locality')) {
        city = component.short_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name;
      }
    });
    
    return `${street.trim()}, ${city}, ${state}`.replace(/, ,/g, ',').trim();
  }
}
