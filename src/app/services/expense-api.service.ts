import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { Expense } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseApiService {
  constructor(private http: HttpClient) {}

  submitExpense(formData: FormData): Observable<any> {
    return this.http.post(`${environment.apiUrl}/expenses`, formData);
  }

  getMyExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${environment.apiUrl}/expenses/my`);
  }
}
