/**
 * Quote/RFP Workflow Models
 *
 * Data models for the Quote/RFP Workflow covering the full pipeline
 * from RFP intake through labor estimation, BOM creation, internal
 * BOM validation, quote assembly, delivery, and quote-to-job conversion.
 */

import { Address, Attachment, ContactInfo, JobType, Priority } from './job.model';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum WorkflowStatus {
  Draft = 'Draft',
  Job_Summary_In_Progress = 'Job_Summary_In_Progress',
  BOM_In_Progress = 'BOM_In_Progress',
  Pending_Validation = 'Pending_Validation',
  Validation_Approved = 'Validation_Approved',
  Validation_Rejected = 'Validation_Rejected',
  Quote_Assembled = 'Quote_Assembled',
  Quote_Delivered = 'Quote_Delivered',
  Quote_Converted = 'Quote_Converted'
}

export enum ValidationStep {
  Request_Sent = 'Request_Sent',
  Under_Review = 'Under_Review',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuoteStep = 'rfpIntake' | 'jobSummary' | 'bom' | 'quoteAssembly';

// ---------------------------------------------------------------------------
// Interfaces – RFP Record
// ---------------------------------------------------------------------------

export interface RfpRecord {
  clientName: string;                          // required, max 200
  projectName: string;                         // required, max 200
  siteName: string;                            // required
  siteAddress: Address;                        // reuses existing Address interface
  customerContact: ContactInfo;                // reuses existing ContactInfo interface
  scopeOfWork: string;                         // required, max 5000
  materialSpecifications: string;              // optional, max 5000
  rfpReceivedDate: string;                     // ISO date, required
  requestedCompletionDate: string | null;      // ISO date, optional, >= rfpReceivedDate
  jobType: JobType;                            // reuses existing enum
  priority: Priority;                          // reuses existing enum
  attachments: Attachment[];                   // reuses existing Attachment interface
}

// ---------------------------------------------------------------------------
// Interfaces – Job Summary
// ---------------------------------------------------------------------------

export interface LaborLineItem {
  id: string;
  taskDescription: string;                     // max 500
  laborCategory: string;                       // max 100
  estimatedHours: number;                      // positive
  hourlyRate: number;                          // positive, 2 decimal places
}

export interface LaborTotals {
  totalHours: number;                          // sum of all estimatedHours
  totalCost: number;                           // sum of (estimatedHours × hourlyRate)
}

export interface JobSummaryData {
  projectName: string;
  siteName: string;
  scopeOfWork: string;
  totalEstimatedHours: number;                 // positive, 2 decimal places
  laborLineItems: LaborLineItem[];
  totalLaborCost: number;                      // computed: sum of (hours × rate)
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Interfaces – BOM (Bill of Materials)
// ---------------------------------------------------------------------------

export interface BomLineItem {
  id: string;
  materialDescription: string;                 // non-empty, max 500
  quantity: number;                            // positive integer
  unitOfMeasure: string;                       // max 50
  unitCost: number;                            // positive, 2 decimal places
  supplierName: string;                        // max 200
  extendedCost: number;                        // computed: quantity × unitCost
  markedUpCost: number;                        // computed: extendedCost × (1 + markup/100)
}

export interface BomTotals {
  subtotal: number;                            // sum of markedUpCost
  tax: number;                                 // non-negative, 2 decimal places
  freight: number;                             // non-negative, 2 decimal places
  grandTotal: number;                          // subtotal + tax + freight
}

export interface BomData {
  lineItems: BomLineItem[];
  markupPercentage: number;                    // 0–100, 2 decimal places, default 10
  tax: number;                                 // non-negative
  freight: number;                             // non-negative
  taxFreightVisible: boolean;                  // customer-facing visibility
  totals: BomTotals;                           // computed
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Interfaces – BOM Validation
// ---------------------------------------------------------------------------

export interface ValidationStepEntry {
  step: ValidationStep;
  timestamp: string;                           // ISO UTC
  actorId: string;
  actorName: string;
  comments: string | null;                     // required for Rejected, max 2000
}

export interface ValidationRequest {
  id: string;
  quoteId: string;
  assignedValidatorId: string;
  assignedValidatorEmail: string;
  currentStep: ValidationStep;
  steps: ValidationStepEntry[];
  createdAt: string;                           // ISO UTC
}

// ---------------------------------------------------------------------------
// Interfaces – Quote Document
// ---------------------------------------------------------------------------

export interface PriceSummary {
  totalLaborCost: number;
  totalMaterialCost: number;                   // marked-up subtotal from BOM
  tax: number;                                 // included in total but may be hidden
  freight: number;                             // included in total but may be hidden
  combinedProjectTotal: number;
  taxFreightVisible: boolean;
}

export interface QuoteDocument {
  priceSummary: PriceSummary;
  statementOfWork: string;                     // max 10000, editable before finalization
  bomLineItems: BomLineItem[];
  taxFreightVisible: boolean;
  finalizedAt: string | null;                  // ISO UTC
  finalizedBy: string | null;
}

// ---------------------------------------------------------------------------
// Interfaces – Delivery
// ---------------------------------------------------------------------------

export interface DeliveryRecord {
  deliveredAt: string;                         // ISO UTC
  recipientEmail: string;
  recipientName: string;
  method: 'email' | 'manual';
}

// ---------------------------------------------------------------------------
// Interfaces – Convert to Job
// ---------------------------------------------------------------------------

export interface ConvertToJobData {
  poNumber: string | null;
  sriJobNumber: string;                        // required
}

// ---------------------------------------------------------------------------
// Interfaces – Client Configuration
// ---------------------------------------------------------------------------

export interface ClientConfiguration {
  id: string;
  clientName: string;
  taxFreightVisible: boolean;                  // default: true
  defaultMarkupPercentage: number;             // default: 10
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Interfaces – Status Tracking
// ---------------------------------------------------------------------------

export interface StatusTransition {
  fromStatus: WorkflowStatus | null;
  toStatus: WorkflowStatus;
  timestamp: string;                           // ISO UTC
  userId: string;
  userName: string;
}

// ---------------------------------------------------------------------------
// Interface – Top-Level Quote Workflow
// ---------------------------------------------------------------------------

export interface QuoteWorkflow {
  id: string;
  workflowStatus: WorkflowStatus;
  rfpRecord: RfpRecord;
  jobSummary: JobSummaryData | null;
  bom: BomData | null;
  validationRequest: ValidationRequest | null;
  quoteDocument: QuoteDocument | null;
  deliveryRecord: DeliveryRecord | null;
  convertedJobId: string | null;
  poNumber: string | null;
  sriJobNumber: string | null;
  statusHistory: StatusTransition[];
  createdBy: string;
  createdAt: string;                           // ISO UTC
  updatedAt: string;                           // ISO UTC
}

// ---------------------------------------------------------------------------
// Interfaces – Filters and Email
// ---------------------------------------------------------------------------

export interface QuoteFilters {
  status?: WorkflowStatus;
  clientName?: string;
  projectName?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface QuoteEmailData {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  attachPdf: boolean;
}

// ---------------------------------------------------------------------------
// Constants – Pipeline Dashboard Category Mapping
// ---------------------------------------------------------------------------

export const PIPELINE_CATEGORIES: Record<string, WorkflowStatus[]> = {
  rfpsReceived: [WorkflowStatus.Draft, WorkflowStatus.Job_Summary_In_Progress],
  bomsNotReady: [WorkflowStatus.BOM_In_Progress, WorkflowStatus.Validation_Rejected],
  bomsReady: [WorkflowStatus.Pending_Validation, WorkflowStatus.Validation_Approved],
  quotesReadyForCustomer: [WorkflowStatus.Quote_Assembled],
  quotesDelivered: [WorkflowStatus.Quote_Delivered],
  quotesConverted: [WorkflowStatus.Quote_Converted]
};
