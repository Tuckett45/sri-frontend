import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { Expense, ExpenseStatus } from '../models/expense.model';

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

  private baseUrl = `${environment.apiUrl}/expenses`;

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

  getMyExpenses(): Observable<Expense[]> {
    return this.getExpenses();
  }

  getTeamExpenses(): Observable<Expense[]> {
    return this.getExpenses();
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

  setExpenseStatus(id: string, status: ExpenseStatus, note?: string): Observable<void> {
    const payload: Record<string, unknown> = { status };
    if (note) {
      payload['note'] = note;
    }
    return this.http.patch<void>(`${this.baseUrl}/${id}/status`, payload, this.httpOptions);
  }
}
