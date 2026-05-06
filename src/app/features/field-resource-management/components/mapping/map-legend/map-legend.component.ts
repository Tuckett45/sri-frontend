import { Component } from '@angular/core';

@Component({
  selector: 'app-map-legend',
  templateUrl: './map-legend.component.html',
  styleUrls: ['./map-legend.component.scss']
})
export class MapLegendComponent {
  legendItems = [
    { label: 'Available', color: '#4caf50', icon: 'person_pin_circle' },
    { label: 'Assigned', color: '#1976d2', icon: 'person_pin_circle' },
    { label: 'On Break', color: '#ff9800', icon: 'person_pin_circle' },
    { label: 'Off Duty', color: '#9e9e9e', icon: 'person_pin_circle' },
    { label: 'Job Site', color: '#e65100', icon: 'place' }
  ];
}
