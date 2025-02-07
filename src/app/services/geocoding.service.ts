import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private apiKey: string;

  constructor(private http: HttpClient) {
    this.apiKey = 'AIzaSyArUJ7zFSO2eI-Prkkvkr_3kNZdDebmVt4';
  }

  geocodeAddress(query: string): Observable<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.apiKey}`;
    return this.http.get<any>(url);
  }

  reverseGeocode(latitude: number, longitude: number): Observable<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;

    return this.http.get<any>(url);
  }
}
