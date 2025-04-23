import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from 'src/environments/environments';
import { local_environment } from 'src/environments/environments';
import { DashboardData } from '../models/dashboard.model'; 
import { VendorIssueStats } from '../models/vendor-issue-stats.model';
import { VendorPunchListStats } from '../models/vendor-punchlist-stats.model';
import { UserPunchListStats } from '../models/user-punchlist-stats.model';
import { User } from '../models/user.model';

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

    getClientStats(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/dashboard/client-stats`);
    }

    getSRIStats(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/dashboard/sri-stats`);
    }

    getPMStats(user: User): Observable<any> {
        return this.http.get(`${environment.apiUrl}/dashboard/pm-stats/${user.company}-${user.market}`);
    }
  }