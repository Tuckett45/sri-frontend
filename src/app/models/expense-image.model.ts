export class ExpenseImage {
  id?: string;
  expenseId: string;
  image: string | File | null;

  constructor(expenseId: string, image: string | File | null = null) {
    this.expenseId = expenseId;
    this.image = image;
  }
}
