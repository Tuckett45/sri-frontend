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
    // const drawnItems = new L.FeatureGroup();
    // this.map.addLayer(drawnItems);

    // const drawControl = new L.Control.Draw({
    //   edit: {
    //     featureGroup: drawnItems, 
    //   },
    //   draw: {
    //     marker: true,  // Allow drawing of markers
    //     polygon: true, // Allow drawing of polygons
    //     polyline: true, // Allow drawing of polylines
    //     rectangle: true, // Allow drawing of rectangles
    //     circle: true // Allow drawing of circles
    //   }
    // });

    // this.map.addControl(drawControl);

    // // Capture drawn object data
    // this.map.on('draw:created', (e) => {
    //   const layer = e.layer;
    //   drawnItems.addLayer(layer); 

    //   const drawnObject = this.extractShapeData(layer); // Extract shape data
    //   this.saveDrawnShape(drawnObject);  // Save the shape to your backend
    // });
  }

  // Extract shape data based on the type of shape
  // private extractShapeData(layer: L.Layer): any {
  //   let shapeData: any = {};
    
  //   if (layer instanceof L.Marker) {
  //     shapeData = {
  //       type: 'marker',
  //       lat: layer.getLatLng().lat,
  //       lng: layer.getLatLng().lng
  //     };
  //   } else if (layer instanceof L.Polygon) {
  //     shapeData = {
  //       type: 'polygon',
  //       coordinates: layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng])
  //     };
  //   } else if (layer instanceof L.Polyline) {
  //     shapeData = {
  //       type: 'polyline',
  //       coordinates: layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng])
  //     };
  //   } else if (layer instanceof L.Rectangle) {
  //     shapeData = {
  //       type: 'rectangle',
  //       bounds: layer.getBounds()
  //     };
  //   } else if (layer instanceof L.Circle) {
  //     shapeData = {
  //       type: 'circle',
  //       lat: layer.getLatLng().lat,
  //       lng: layer.getLatLng().lng,
  //       radius: layer.getRadius()
  //     };
  //   }

  //   return shapeData;
  // }

  // Send the shape data to the backend for saving
  // private saveDrawnShape(shapeData: any): void {
  //   // Replace this with the actual API call to save the shape data
  //   this.mapMarkerService.saveDrawnShape(shapeData).subscribe(response => {
  //     console.log('Shape saved:', response);
  //   }, error => {
  //     console.error('Error saving shape:', error);
  //   });
  // }
  
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
