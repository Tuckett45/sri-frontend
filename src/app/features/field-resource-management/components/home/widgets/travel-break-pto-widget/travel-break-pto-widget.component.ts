import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-travel-break-pto-widget',
  templateUrl: './travel-break-pto-widget.component.html',
  styleUrls: ['./travel-break-pto-widget.component.scss']
})
export class TravelBreakPtoWidgetComponent implements OnInit {
  travelStatus = 'None';
  breakStatus = 'None';
  ptoBalance = 0;

  ngOnInit(): void {}
}
