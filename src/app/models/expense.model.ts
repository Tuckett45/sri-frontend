export type ExpenseStatus = 'submitted' | 'approved' | 'rejected' | 'reimbursed';

export class Expense {
  id?: string;
  date: Date;
  category: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
  status: ExpenseStatus;

  constructor(
    date: Date = new Date(),
    category: string = '',
    amount: number = 0,
    description?: string,
    receiptUrl?: string,
    status: ExpenseStatus = 'submitted'
  ) {
    this.date = date;
    this.category = category;
    this.amount = amount;
    this.description = description;
    this.receiptUrl = receiptUrl;
    this.status = status;
  }
}
