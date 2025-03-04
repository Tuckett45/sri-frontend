import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private apiKey: string;
  private geocodeCache: { [key: string]: any } = {};

  constructor(private http: HttpClient) {
    this.apiKey = 'AIzaSyArUJ7zFSO2eI-Prkkvkr_3kNZdDebmVt4';
  }

  geocodeAddress(query: string): Observable<any> {
    if (this.geocodeCache[query]) {
      return new Observable((observer) => {
        observer.next(this.geocodeCache[query]);
        observer.complete();
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.apiKey}`;
    return this.http.get<any>(url).pipe(
      map((response: any) => {
        this.geocodeCache[query] = response;
        return response;
      })
    );
  }

  // Reverse geocode with caching
  reverseGeocode(latitude: number, longitude: number): Observable<any> {
    const key = `${latitude},${longitude}`;
    if (this.geocodeCache[key]) {
      return new Observable((observer) => {
        observer.next(this.geocodeCache[key]);
        observer.complete();
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        this.geocodeCache[key] = response;
        return response;
      })
    );
  }
}
