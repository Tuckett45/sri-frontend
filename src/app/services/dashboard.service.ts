import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { shareReplay } from 'rxjs/operators';
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

    private clientStatsCache$!: Observable<any> | null;
    private sriStatsCache$!: Observable<any> | null;
    private pmStatsCache$!: { [key: string]: Observable<any> };

    constructor(private http: HttpClient) {
        this.clientStatsCache$ = null;
        this.sriStatsCache$ = null;
        this.pmStatsCache$ = {};
    }

    getClientStats(): Observable<any> {
        if (!this.clientStatsCache$) {
            this.clientStatsCache$ = this.http
                .get(`${environment.apiUrl}/dashboard/client-stats`)
                .pipe(shareReplay(1));
        }
        return this.clientStatsCache$;
    }

    getSRIStats(): Observable<any> {
        if (!this.sriStatsCache$) {
            this.sriStatsCache$ = this.http
                .get(`${environment.apiUrl}/dashboard/sri-stats`)
                .pipe(shareReplay(1));
        }
        return this.sriStatsCache$;
    }

    getPMStats(user: User): Observable<any> {
        const key = `${user.company}-${user.market}`;
        if (!this.pmStatsCache$[key]) {
            this.pmStatsCache$[key] = this.http
                .get(`${environment.apiUrl}/dashboard/pm-stats/${key}`)
                .pipe(shareReplay(1));
        }
        return this.pmStatsCache$[key];
    }  
}