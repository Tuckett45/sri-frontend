import { AfterViewInit, Component, OnInit } from '@angular/core';
import { StreetSheetService } from 'src/app/services/street-sheet.service'; 
import * as L from 'leaflet';
import 'leaflet-search';
import 'leaflet-draw';  
import 'leaflet.markercluster';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { MapMarkerService } from 'src/app/services/map-marker.service';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';

@Component({
  selector: 'street-sheet-map',
  templateUrl: './street-sheet-map.component.html',
  styleUrls: ['./street-sheet-map.component.scss']
})
export class StreetSheetMapComponent implements AfterViewInit {
  private map!: L.Map;
  private searchControl: any;
  streetSheets: StreetSheet[] = [];
  osmLayer!: L.TileLayer;
  satelliteLayer!: L.TileLayer;
  markersClusterGroup!: L.MarkerClusterGroup;
  mapMarkers!: MapMarker[];
  stateAbbreviations!: StateAbbreviation;
  reversedAddress!: {
    street: string;
    city: string;
    state: string;
  };

  constructor(
    private streetSheetService: StreetSheetService, 
    private mapMarkerService: MapMarkerService,
    private geocodingService: GeocodingService
  ) {}

  ngAfterViewInit() {
    this.loadStreetSheets();
    this.initMap();
    // this.initSearch();
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

  getReversedAddress(marker: MapMarker){
    this.geocodingService.reverseGeocode(marker.latitude, marker.longitude).subscribe(suggestions => {
      if (suggestions && suggestions.length > 0) {
        const address = suggestions[0].address || {};  
        const streetAddress = address.house_number && address.road 
          ? `${address.house_number} ${address.road}` 
          : address.road || '';
  
        const city = address.city || address.town || ''; 
        const state = address.state || '';  
        const abbreviatedState = this.stateAbbreviations[state] || state || '';  
        debugger;
        this.reversedAddress = {
          street: streetAddress.trim(),
          city: city,
          state: abbreviatedState
        };
      }
    });
  }

  centerMapOnMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    if (this.map) {
      this.getReversedAddress(marker);
      debugger;
      const latLng = new L.LatLng(marker.latitude, marker.longitude);
      this.map.setView(latLng, 15); 
      L.marker(latLng).addTo(this.map).bindPopup(`
        <b>${streetSheet.vendorName}</b><br>
        Segment ID: ${streetSheet.segmentId}<br>
        Street: ${this.reversedAddress.street}<br>
        City: ${this.reversedAddress.city}<br>
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

    this.osmLayer.addTo(this.map);

    L.control.layers({
      'OpenStreetMap': this.osmLayer
    }).addTo(this.map);

    const markers = this.mapMarkers;
    const markerLayer = L.layerGroup().addTo(this.map); 

    markers.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude]).addTo(markerLayer).bindPopup(pin.segmentId);
      markerLayer.addLayer(marker);
    });
 
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

  private initSearch(): void {    
    const searchLayer = L.layerGroup().addTo(this.map);
       
    const geoJsonLayer = L.geoJSON().addTo(searchLayer);
      
    // this.map.addControl(new L.Control.Search({
    //   layer: searchLayer,
    //   propertyName: 'street',  
    //   initial: false,
    //   zoom: 15,
    //   marker: false
    // }));
  }
  
  
  public addMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    this.getReversedAddress(marker);
    if (marker.latitude && marker.longitude) {
      const newMarker = L.marker([marker.latitude, marker.longitude]).bindPopup(`
        <b>${streetSheet.vendorName}</b><br>
        Segment ID: ${streetSheet.segmentId}<br>
        Street: ${this.reversedAddress.street}<br>
        City: ${this.reversedAddress.city}<br>
        <b>Marker ID:</b> ${marker.id}
      `).openPopup();
      this.markersClusterGroup.addLayer(newMarker); 
    }
  }
}
