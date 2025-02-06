import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private proxyUrl: string;

  constructor(private http: HttpClient) {
    this.proxyUrl = 'https://proxy-server-c4andmbdb5fpaqht.centralus-01.azurewebsites.net';
    //'http://localhost:5000/proxy'; --LOCAL PROXY SERVER
    //'https://proxy-server-c4andmbdb5fpaqht.centralus-01.azurewebsites.net/proxy'; -- PROD PROXY SERVER
  }

  geocodeAddress(query: string): Observable<any> {
    const url = `${this.proxyUrl}/api/geocode?query=${query}`;
    return this.http.get<any[]>(url);
  }

  reverseGeocode(latitude: number, longitude: number): Observable<any> {
    const url = `${this.proxyUrl}/proxy/reverse-geocode?lat=${latitude}&lon=${longitude}`;
    return this.http.get<any>(url);
  }
}
