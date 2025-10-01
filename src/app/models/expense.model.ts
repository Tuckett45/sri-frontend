// src/app/models/expense.model.ts
export enum ExpenseCategory {
  Meals = 'Meals',
  Entertainment = 'Entertainment',
  Lodging = 'Lodging',
  Airfare = 'Airfare',
  TransportationFees = 'TransportationFees',
  Fuel = 'Fuel',
  Mileage = 'Mileage',
  OfficeExpense = 'OfficeExpense',
  Other = 'Other',
  EmployeePerks = 'EmployeePerks'
}

export enum PaymentMethod {
  EmployeePaid = 'EmployeePaid',
  CompanyCard = 'CompanyCard',
  CompanyAccount = 'CompanyAccount'
}

export interface EntertainmentDetail {
  typeOfEntertainment: string;
  nameOfEstablishment: string;
  numberInParty: number;
  businessRelationship: string;
  businessPurpose: string;
}

export enum ExpenseStatus {
  Pending  = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected'
}


export interface ExpenseImage {
  id: string;
  expenseId: string;
  blobUrl: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  createdBy?: string;
  createdDate: string;
}

export interface Expense {
  id?: string;
  date: string;              // ISO 'YYYY-MM-DD'
  projectId: string;
  phase: string;
  locationText?: string;
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  mileageMiles?: number | null;
  descriptionNotes?: string | null;
  isEntertainment: boolean;
  status: ExpenseStatus;
  entertainment?: EntertainmentDetail | null;

  images?: ExpenseImage[];

  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

export interface ExpenseListItem extends Expense {
  hasReceipts: boolean;
}

export interface ExpenseListResponse {
  page: number;
  pageSize: number;
  items: ExpenseListItem[];
}

