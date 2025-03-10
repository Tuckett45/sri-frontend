import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from 'src/environments/environments';

@Injectable({
    providedIn: 'root'
  })
  export class DashboardService {
    private httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': 'ffd675634ab645d7845640bb88d672d8'
        })
      };
  
    constructor(private http: HttpClient) {}
  
    getDashboardData(startDate?: Date, endDate?: Date, userRole?: string): Observable<any> {
      const params = new HttpParams()
        .set('startDate', startDate?.toISOString() || '')
        .set('endDate', endDate?.toISOString() || '')
        .set('userRole', userRole || '');
  
      return this.http.get(`${environment.apiUrl}/dashboard/getDashboardData`, { params });
    }
  }