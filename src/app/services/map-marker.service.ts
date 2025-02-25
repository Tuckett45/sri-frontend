import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { staging_environment } from 'src/environments/environments';
import { StreetSheet } from '../models/street-sheet.model';
import { MapMarker } from '../models/map-marker.model';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService {

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': staging_environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  getMapMarkers(): Observable<any> {
    return this.http.get<any>(`${staging_environment.apiUrl}/MapMarker`);
  }

  addMapMarker(mapMarker: MapMarker): Observable<any> {
    return this.http.post<any>(`${staging_environment.apiUrl}/MapMarker`, mapMarker);
  }

  getMapMarkersForStreetSheet(streetSheetId: string): Observable<MapMarker[]> {
    return this.http.get<MapMarker[]>(`${staging_environment.apiUrl}/MapMarker/${streetSheetId}`);
  }

  editMapMarker(mapMarker: MapMarker): Observable<any> {
    return this.http.put<any>(`${staging_environment.apiUrl}/MapMarker/update`, mapMarker);
  }

  deleteMapMarker(mapMarker: MapMarker): Observable<any> {
    return this.http.delete<any>(`${staging_environment.apiUrl}/MapMarker/delete/${mapMarker.id}`);
  }

  getSegmentIds(){
    return this.http.get<any>(`${staging_environment.apiUrl}/MapMarker/segmentIds`);
  }
}