// --- Job Setup Form Value ---

export interface JobSetupFormValue {
  customerInfo: {
    clientName: string;
    siteName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    pocName: string;
    pocPhone: string;
    pocEmail: string;
    targetStartDate: string;       // ISO date
    authorizationStatus: 'authorized' | 'pending';
    hasPurchaseOrders: boolean;
    purchaseOrderNumber: string;
  };
  pricingBilling: {
    standardBillRate: number;
    overtimeBillRate: number;
    perDiem: number;
    invoicingProcess: string;
  };
  sriInternal: {
    projectDirector: string;
    targetResources: number;
    bizDevContact: string;
    requestedHours: number;
    overtimeRequired: boolean;
    estimatedOvertimeHours: number | null;
  };
}

// --- Job Setup Draft ---

export interface JobSetupDraft {
  formValue: JobSetupFormValue;
  currentStep: number;
  savedAt: string; // ISO timestamp
}
