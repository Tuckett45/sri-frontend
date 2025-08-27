export enum ExpenseStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

export type ExpenseType =
  | 'Meals'
  | 'Lodging'
  | 'Fuel'
  | 'Mileage'
  | 'Materials'
  | 'Other';

export class Expense {
  id?: string;
  job!: string;
  phase!: string;
  date!: Date;
  expenseType!: ExpenseType;
  amount!: number;
  notes?: string;
  receiptUrl?: string;
  status: ExpenseStatus = ExpenseStatus.Pending;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;

  constructor(init?: Partial<Expense>) {
    Object.assign(this, init);
  }
}
