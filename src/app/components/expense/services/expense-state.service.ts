import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ExpenseListItem } from 'src/app/models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseStateService {
  private readonly hrExpensesSubject = new BehaviorSubject<ExpenseListItem[]>([]);
  readonly hrExpenses$: Observable<ExpenseListItem[]> = this.hrExpensesSubject.asObservable();

  setHrExpenses(expenses: ExpenseListItem[] | null | undefined): void {
    this.hrExpensesSubject.next(expenses ? [...expenses] : []);
  }

  getHrExpensesSnapshot(): ExpenseListItem[] {
    return this.hrExpensesSubject.getValue();
  }

  clearHrExpenses(): void {
    this.hrExpensesSubject.next([]);
  }
}
