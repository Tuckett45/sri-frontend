import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TpsService {

  private apiUrl = 'https://your-backend-api-url.com/api/tps'; // Replace with your actual API URL

  constructor(private http: HttpClient) {}

  // Upload CSV Data
  uploadCsvData(csvData: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload-csv`, csvData);
  }

  // Submit Manual Entry
  submitManualEntry(entry: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/manual-entry`, entry);
  }
}
