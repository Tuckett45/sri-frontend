import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-travel-overview',
  templateUrl: './travel-overview.component.html',
  styleUrls: ['./travel-overview.component.scss']
})
export class TravelOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  travelEntries: any[] = [];
  displayedColumns = ['technician', 'destination', 'startDate', 'endDate', 'hotel'];

  get totalTravelDays(): number {
    return this.travelEntries.reduce((sum, e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
  }

  get totalHotelNights(): number {
    return this.travelEntries.filter(e => e.hotel).reduce((sum, e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
  }

  get totalMilesDriven(): number {
    return this.travelEntries.reduce((sum, e) => sum + (e.miles || 0), 0);
  }

  ngOnInit(): void {}

  addTravel(): void {
    // Open dialog logic here
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
