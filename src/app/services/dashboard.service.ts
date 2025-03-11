import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from 'src/environments/environments';
import { local_environment } from 'src/environments/environments';

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
  
    getClientDashboardData(): Observable<any> {
  
      return this.http.get(`${local_environment.apiUrl}/dashboard/client-dashboard`);
    }

    getSRIDashboardData(): Observable<any> {
        return this.http.get(`${local_environment.apiUrl}/dashboard/sri-dashboard`);
    }

    getPMDashboardData(): Observable<any> {
        return this.http.get(`${local_environment.apiUrl}/dashboard/pm-dashboard`);
    }

    getClientStats(): Observable<any> {
        return this.http.get(`${local_environment.apiUrl}/dashboard/client-stats`);
    }

    getSRIStats(): Observable<any> {
        return this.http.get(`${local_environment.apiUrl}/dashboard/sri-stats`);
    }

    getPMStats(): Observable<any> {
        return this.http.get(`${local_environment.apiUrl}/dashboard/pm-stats`);
    }
  }