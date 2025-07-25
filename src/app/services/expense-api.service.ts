import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { Expense } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseApiService {
  private httpOptions = {
    headers: new HttpHeaders({
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  private baseUrl = `${environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  submitExpense(expense: FormData): Observable<Expense> {
    return this.http.post<Expense>(this.baseUrl, expense, this.httpOptions);
  }

  getExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.baseUrl, this.httpOptions);
  }
}
