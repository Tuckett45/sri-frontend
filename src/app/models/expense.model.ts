export enum ExpenseStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

export class Expense {
  id?: string;
  date!: Date;
  category!: string;
  amount!: number;
  description?: string;
  receiptUrl?: string;
  status!: ExpenseStatus;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;

  constructor(init?: Partial<Expense>) {
    Object.assign(this, init);
  }
}
