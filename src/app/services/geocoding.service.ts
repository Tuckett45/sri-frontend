import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  constructor(private http: HttpClient) {}

  // Function to get coordinates using Nominatim API
  geocodeAddress(query: string): Observable<any> {
    const url = `https://nominatim.openstreetmap.org/search?addressdetails=1&format=jsonv2&q=${query}&countrycodes=US&layer=address&limit=5`;
    return this.http.get<any[]>(url);
  }

  reverseGeocode(latitude: number, longitude: number){
    debugger;
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    return this.http.get<any[]>(url);
  }
}