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
  attendees: string;
}

export interface MileageDetail {
  id?: string;
  expenseId: string;
  date: string;              // ISO 'YYYY-MM-DD'
  customerJobNumber?: string;
  fromLocation: string;
  toLocation: string;
  reasonForTravel: string;
  beginningMileage: number;
  endingMileage: number;
  totalMiles: number;
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
  locationText?: string;
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  mileageMiles?: number | null;
  descriptionNotes?: string | null;
  isEntertainment: boolean;
  mobilization: boolean;
  weekEndingDate?: string | null;  // ISO 'YYYY-MM-DD' for mileage expenses
  status: ExpenseStatus;
  phase?: string | null;
  entertainment?: EntertainmentDetail | null;
  mileage?: MileageDetail[] | null;

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
  total?: number;
}
