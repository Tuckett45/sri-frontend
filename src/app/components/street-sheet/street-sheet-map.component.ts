import { Component, OnInit } from '@angular/core';
import { StreetSheetService } from 'src/app/services/street-sheet.service'; 
import * as L from 'leaflet';
import 'leaflet-draw';  
import 'leaflet.markercluster';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { MapMarkerService } from 'src/app/services/map-marker.service';

@Component({
  selector: 'street-sheet-map',
  templateUrl: './street-sheet-map.component.html',
  styleUrls: ['./street-sheet-map.component.scss']
})
export class StreetSheetMapComponent implements OnInit {
  private map: L.Map | undefined;
  streetSheets: StreetSheet[] = [];
  osmLayer!: L.TileLayer;
  satelliteLayer!: L.TileLayer;
  markersClusterGroup!: L.MarkerClusterGroup;

  constructor(private streetSheetService: StreetSheetService, private mapMarkerService: MapMarkerService) {}

  ngOnInit(): void {
    this.initMap();
    this.loadStreetSheets();
  }

  public loadStreetSheets(): void {
    this.streetSheetService.getStreetSheets().subscribe(streetSheets => {
      streetSheets.forEach((sheet: StreetSheet) => {
        this.mapMarkerService.getMapMarkersForStreetSheet(sheet.segmentId).subscribe(mapMarkers => {
          sheet.marker = mapMarkers;
  
          mapMarkers.forEach(marker => {
            if (marker.latitude && marker.longitude) {
              this.addMarker(marker, sheet);
            }
          });
        });
      });
      this.streetSheets = streetSheets;
    });
  }

  centerMapOnMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    if (this.map) {
      const latLng = new L.LatLng(marker.latitude, marker.longitude);
      this.map.setView(latLng, 15); 
      L.marker(latLng).addTo(this.map).bindPopup(`
        <b>${streetSheet.vendorName}</b><br>
        Segment ID: ${streetSheet.segmentId}<br>
        Street: ${streetSheet.streetAddress}<br>
        City: ${streetSheet.city}<br>
        <b>Marker ID:</b> ${marker.id}
      `)
      .openPopup();
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([37.138556308643494, -92.26058157648076], 13); 
    
    this.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ''
    });
    this.satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: 'Map data'
    });

    this.osmLayer.addTo(this.map);

    L.control.layers({
      'OpenStreetMap': this.osmLayer,
      'Satellite': this.satelliteLayer
    }).addTo(this.map);

    this.markersClusterGroup = L.markerClusterGroup().addTo(this.map);

    // Add drawing tools
    const drawnItems = new L.FeatureGroup();
    this.map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems, 
      },
      draw: {
        marker: false
      }
    });

    this.map.addControl(drawControl);

    this.map.on('draw:created', (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer); 
    });
  }
  
  public addMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    if (marker.latitude && marker.longitude) {
      L.marker([marker.latitude, marker.longitude]).addTo(this.map!)
        .bindPopup(`
          <b>${streetSheet.vendorName}</b><br>
          Segment ID: ${streetSheet.segmentId}<br>
          Street: ${streetSheet.streetAddress}<br>
          City: ${streetSheet.city}<br>
          <b>Marker ID:</b> ${marker.id}
        `)
        .openPopup();
    }
  }
}
