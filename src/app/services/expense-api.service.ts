import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment, local_environment } from 'src/environments/environments';
import { Expense } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseApiService {
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  private baseUrl = `${local_environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  submitExpense(expense: Expense): Observable<Expense> {
    const payload = {
      ...expense,
      date: expense.date instanceof Date ? expense.date.toISOString() : expense.date
    };
    return this.http.post<Expense>(this.baseUrl, payload, this.httpOptions);
  }

  getExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.baseUrl, this.httpOptions);
  }

  updateExpense(expense: Expense): Observable<void> {
    const payload = {
      ...expense,
      date: expense.date instanceof Date ? expense.date.toISOString() : expense.date
    };
    return this.http.put<void>(`${this.baseUrl}/${expense.id}`, payload, this.httpOptions);
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.httpOptions);
  }
}
