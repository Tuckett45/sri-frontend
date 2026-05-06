import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-available-technicians-widget',
  templateUrl: './available-technicians-widget.component.html',
  styleUrls: ['./available-technicians-widget.component.scss']
})
export class AvailableTechniciansWidgetComponent implements OnInit {
  availableCount = 0;
  totalCount = 0;
  availableTechnicians: any[] = [];

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.select(state => (state as any)['technicians']?.technicians || []).subscribe(
      (technicians: any[]) => {
        this.totalCount = technicians.length;
        this.availableTechnicians = technicians.filter((t: any) => t.status === 'available' || t.available);
        this.availableCount = this.availableTechnicians.length;
      }
    );
  }
}
