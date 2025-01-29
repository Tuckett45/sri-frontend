import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  constructor(private http: HttpClient) {}

  // Function to get coordinates using the proxy for Nominatim API
  geocodeAddress(query: string): Observable<any> {
    const url = `http://localhost:5000/proxy/geocode?query=${query}`;
    return this.http.get<any[]>(url);
  }

  reverseGeocode(latitude: number, longitude: number): Observable<any> {
    const url = `http://localhost:5000/proxy/reverse-geocode?lat=${latitude}&lon=${longitude}`;
    return this.http.get<any>(url);
  }
}
