import { Component, OnInit, OnDestroy, Input, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() technicians: any[] = [];
  @Input() jobs: any[] = [];
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Map library (e.g. Leaflet) would be initialized here
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
