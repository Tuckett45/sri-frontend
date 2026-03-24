export interface IncidentReport {
  id: string;
  type: 'auto_accident' | 'work_injury' | 'other';
  employeeId: string;
  reportedBy: string;
  reportedAt: Date;
  description: string;
}

export interface DirectDepositChange {
  id: string;
  employeeId: string;
  submittedBy: string;
  submittedAt: Date;
  bankAccountLast4: string;
  routingNumberLast4: string;
}

export interface W4Change {
  id: string;
  employeeId: string;
  submittedBy: string;
  submittedAt: Date;
  filingStatus: string;
  allowances: number;
}

export interface ContactInfoChange {
  id: string;
  employeeId: string;
  updatedBy: string;
  updatedAt: Date;
  address?: string;
  phone?: string;
  email?: string;
}

export interface PrcSignature {
  id: string;
  employeeId: string;
  signedBy: string;
  signedAt: Date;
  documentRef: string;
}
