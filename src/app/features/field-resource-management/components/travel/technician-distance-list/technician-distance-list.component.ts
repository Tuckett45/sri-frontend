import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';

import { TechnicianDistance, PerDiemConfig } from '../../../models/travel.model';
import * as TravelActions from '../../../state/travel/travel.actions';
import {
  selectTechniciansSortedByDistance,
  selectDistanceCalculationLoading,
  selectTravelError,
  selectPerDiemConfig
} from '../../../state/travel/travel.selectors';

@Component({
  selector: 'app-technician-distance-list',
  templateUrl: './technician-distance-list.component.html',
  styleUrls: ['./technician-distance-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicianDistanceListComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;
  @Input() travelRequired = false;
  @Input() showSelectButton = false;

  @Output() technicianSelected = new EventEmitter<TechnicianDistance>();

  techniciansWithDistance$!: Observable<TechnicianDistance[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  perDiemConfig$!: Observable<PerDiemConfig>;

  displayedColumns = ['rank', 'technician', 'distance', 'drivingTime', 'travelStatus', 'perDiem'];

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    // Calculate distances for the job
    this.store.dispatch(TravelActions.calculateDistances({ jobId: this.jobId }));

    // Setup observables
    this.techniciansWithDistance$ = this.store.select(
      selectTechniciansSortedByDistance(this.jobId, this.travelRequired)
    );
    this.loading$ = this.store.select(selectDistanceCalculationLoading);
    this.error$ = this.store.select(selectTravelError);
    this.perDiemConfig$ = this.store.select(selectPerDiemConfig);

    // Add select column if needed
    if (this.showSelectButton) {
      this.displayedColumns = [...this.displayedColumns, 'actions'];
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear distances when component is destroyed
    this.store.dispatch(TravelActions.clearDistances({ jobId: this.jobId }));
  }

  selectTechnician(technician: TechnicianDistance): void {
    this.technicianSelected.emit(technician);
  }

  formatDistance(miles: number | null): string {
    if (miles === null) return 'N/A';
    return `${miles.toFixed(1)} mi`;
  }

  formatDrivingTime(minutes: number | null): string {
    if (minutes === null) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours} hr`;
    } else {
      return `${hours} hr ${mins} min`;
    }
  }

  getTravelStatusClass(technician: TechnicianDistance): string {
    if (technician.willingToTravel) {
      return 'travel-willing';
    }
    return 'travel-not-willing';
  }

  getTravelStatusLabel(technician: TechnicianDistance): string {
    return technician.willingToTravel ? 'Willing' : 'Not Willing';
  }

  getPerDiemAmount(technician: TechnicianDistance, config: PerDiemConfig): number {
    if (!technician.perDiemEligible || technician.distanceMiles === null) {
      return 0;
    }
    
    if (config.flatRateAmount !== null) {
      return config.flatRateAmount;
    }
    
    return technician.distanceMiles * config.ratePerMile;
  }

  isRecommended(technician: TechnicianDistance, index: number): boolean {
    // Recommend technicians who are willing to travel and are in the top 3 closest
    return technician.willingToTravel && 
           technician.distanceMiles !== null && 
           index < 3;
  }

  getRowClass(technician: TechnicianDistance, index: number): string {
    const classes: string[] = [];
    
    if (this.isRecommended(technician, index)) {
      classes.push('recommended');
    }
    
    if (!technician.willingToTravel && this.travelRequired) {
      classes.push('not-eligible');
    }
    
    return classes.join(' ');
  }

  trackByTechnicianId(index: number, technician: TechnicianDistance): string {
    return technician.technicianId;
  }

  refreshDistances(): void {
    this.store.dispatch(TravelActions.calculateDistances({ jobId: this.jobId }));
  }
}
