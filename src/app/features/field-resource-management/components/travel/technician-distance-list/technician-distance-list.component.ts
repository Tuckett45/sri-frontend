import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-technician-distance-list',
  templateUrl: './technician-distance-list.component.html',
  styleUrls: ['./technician-distance-list.component.scss']
})
export class TechnicianDistanceListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @Input() technicianId = '';

  distances: { jobId: string; jobTitle: string; distance: number; travelTime: string }[] = [];
  displayedColumns = ['jobTitle', 'distance', 'travelTime', 'status'];

  getDistanceClass(distance: number): string {
    if (distance < 50) return 'distance-green';
    if (distance <= 150) return 'distance-yellow';
    return 'distance-red';
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
