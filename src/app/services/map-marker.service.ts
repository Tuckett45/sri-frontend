import { Observable, from, throwError } from 'rxjs';
import { environment } from 'src/environments/environments';
import { MapMarker } from '../models/map-marker.model';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, tap } from 'rxjs/operators';
import { OfflineCacheService } from './offline-cache.service';

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService {

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': 'ffd675634ab645d7845640bb88d672d8'
    })
  };

  constructor(private http: HttpClient, private offlineCache: OfflineCacheService) {}

  getMapMarkers(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/MapMarker`);
  }

  addMapMarker(mapMarker: MapMarker): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/MapMarker`, mapMarker);
  }

  getMapMarkersForStreetSheet(streetSheetId: string): Observable<MapMarker[]> {
    const offline$ = from(this.offlineCache.getStreetSheetMarkers(streetSheetId));

    if (!this.offlineCache.isOnline()) {
      return offline$;
    }

    return this.http.get<MapMarker[]>(`${environment.apiUrl}/MapMarker/${streetSheetId}`).pipe(
      tap(markers => { void this.offlineCache.saveStreetSheetMarkers(streetSheetId, markers); }),
      catchError(error =>
        offline$.pipe(
          catchError(() => throwError(() => error))
        )
      )
    );
  }

  editMapMarker(mapMarker: MapMarker): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/MapMarker/update`, mapMarker);
  }

  deleteMapMarker(mapMarker: MapMarker): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/MapMarker/delete/${mapMarker.id}`);
  }

  getSegmentIds(){
    return this.http.get<any>(`${environment.apiUrl}/MapMarker/segmentIds`);
  }
}