// --- Type Aliases ---

export type IncidentType = 'auto_accident' | 'work_injury' | 'other';

export type AccountType = 'checking' | 'savings';

export type FilingStatus =
  | 'single_or_married_filing_separately'
  | 'married_filing_jointly'
  | 'head_of_household';

// --- Incident Reports ---

export interface IncidentReport {
  id: string;
  type: IncidentType;
  employeeId: string;
  incidentDate: string;   // ISO date
  description: string;
  reportedBy: string;
  reportedAt: string;     // ISO datetime
}

export interface CreateIncidentReportPayload {
  employeeId: string;
  type: IncidentType;
  incidentDate: string;
  description: string;
}

export interface IncidentReportFilters {
  type?: IncidentType;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// --- Direct Deposit ---

export interface DirectDepositChange {
  id: string;
  employeeId: string;
  bankName: string;
  accountType: AccountType;
  bankAccountLast4: string;
  routingNumberLast4: string;
  submittedBy: string;
  submittedAt: string;    // ISO datetime
}

export interface DirectDepositPayload {
  employeeId: string;
  bankName: string;
  accountType: AccountType;
  routingNumber: string;
  accountNumber: string;
  accountNumberConfirm: string;
}

// --- W-4 Changes ---

export interface W4Change {
  id: string;
  employeeId: string;
  filingStatus: FilingStatus;
  multipleJobsOrSpouseWorks: boolean;
  claimDependents: number;
  otherIncome: number;
  deductions: number;
  extraWithholding: number;
  submittedBy: string;
  submittedAt: string;    // ISO datetime
}

export interface W4Payload {
  employeeId: string;
  filingStatus: FilingStatus;
  multipleJobsOrSpouseWorks: boolean;
  claimDependents: number;
  otherIncome: number;
  deductions: number;
  extraWithholding: number;
}

// --- Contact Info Changes ---

export interface ContactInfoChange {
  id: string;
  employeeId: string;
  address?: string;
  phone?: string;
  email?: string;
  updatedBy: string;
  updatedAt: string;      // ISO datetime
  fieldsChanged: string[];
}

export interface ContactInfoPayload {
  employeeId: string;
  address?: string;
  phone?: string;
  email?: string;
}

// --- PRC Signing ---

export interface PrcSignature {
  id: string;
  employeeId: string;
  signedBy: string;
  signedAt: string;       // ISO datetime
  documentRef: string;
}

export interface PrcPayload {
  employeeId: string;
  documentRef: string;
  signature: string;
}

// --- Pay Stubs ---

export interface DeductionItem {
  name: string;
  amount: number;
}

export interface PayStub {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossPay: number;
  deductions: DeductionItem[];
  totalDeductions: number;
  netPay: number;
  paymentDate: string;    // ISO date
}

export interface PayStubFilters {
  year?: number;
  payPeriod?: string;
}

// --- W-2 Documents ---

export interface W2Document {
  id: string;
  employeeId: string;
  taxYear: number;
  employerName: string;
  employeeName: string;
  wagesTips: number;
  federalIncomeTaxWithheld: number;
  socialSecurityWages: number;
  socialSecurityTaxWithheld: number;
  medicareWages: number;
  medicareTaxWithheld: number;
}

// --- Service Error ---

export interface PayrollServiceError {
  statusCode: number;
  message: string;
  operation: string;
}

// --- Audit Metadata ---

export interface AuditMetadata {
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;      // ISO UTC
}
