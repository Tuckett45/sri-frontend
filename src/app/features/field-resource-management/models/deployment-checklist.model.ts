/**
 * Deployment Checklist Workflow Models
 *
 * Data models for the four-phase deployment checklist:
 * Job Details, Pre-Installation, End of Day Reports, and Close-Out.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum ChecklistStatus {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Completed = 'Completed'
}

export enum PhaseStatus {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Completed = 'Completed'
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChecklistPhase = 'jobDetails' | 'preInstallation' | 'eodReports' | 'closeOut';

export type ChecklistItemResponse = 'Yes' | 'No' | 'NotApplicable' | null;

// ---------------------------------------------------------------------------
// Interfaces – Job Details Phase
// ---------------------------------------------------------------------------

export interface ChecklistContact {
  name: string;
  phone: string;
  email: string;
}

export interface JobDetailsPhaseData {
  sriJobNumbers: string[];
  customerJobNumbers: string[];
  changeTickets: string[];
  siteAccessTickets: string[];
  jobStartDate: string | null;                // ISO date
  jobCompleteDate: string | null;             // ISO date
  siteName: string;
  suiteNumber: string;
  street: string;
  cityState: string;
  zipCode: string;
  proposedValidationDateTime: string | null;  // ISO datetime
  technicalLead: ChecklistContact;
  technician1: ChecklistContact;
  technician2: ChecklistContact;
  sriProjectLead: ChecklistContact;
  primaryCustomerContact: ChecklistContact;
  secondaryCustomerContact: ChecklistContact;
  statementOfWork: string;                    // maxLength 5000
}

// ---------------------------------------------------------------------------
// Interfaces – Pre-Installation Phase
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string;
  label: string;
  playbookReference: string | null;  // e.g., "2.1", "1.4"
  response: ChecklistItemResponse;
  notes: string;                     // maxLength 1000
}

export interface PreInstallationPhaseData {
  items: ChecklistItem[];
  markedComplete: boolean;           // explicit completion flag
}

// ---------------------------------------------------------------------------
// Interfaces – End of Day (EOD) Report Phase
// ---------------------------------------------------------------------------

export interface DailyProgress {
  devicesRacked: number;             // 0-100
  devicesPowered: number;           // 0-100
  cablingInstalledDressed: number;   // 0-100
  cablesTested: number;             // 0-100
  labelsInstalled: number;          // 0-100
  customerValidation: number;       // 0-100
}

export interface EodEntry {
  id: string;
  date: string;                      // ISO date
  personnelOnSite: string;
  technicalLeadName: string;
  technicianNames: string;
  timeIn: string;                    // HH:mm
  timeOut: string;                   // HH:mm
  customerNotificationName: string;
  customerNotificationMethod: string;
  dailyProgress: DailyProgress;
  dailyPicturesProvided: boolean;
  edpRedlineRequired: boolean;
  workCompletedToday: string;        // maxLength 3000
  issuesRoadblocks: string;          // maxLength 3000
  planForTomorrow: string;           // maxLength 3000
  submittedBy: string;
  submittedAt: string;               // ISO UTC
}

// ---------------------------------------------------------------------------
// Interfaces – Close-Out Phase
// ---------------------------------------------------------------------------

export interface HandoffParticipant {
  company: string;
  date: string | null;               // ISO date
  name: string;
}

export interface CloseOutPhaseData {
  // Equipment Hand-off
  sriLead: HandoffParticipant;
  customerLead: HandoffParticipant;
  otherParticipants: string;

  // Required Pictures
  requiredPictures: ChecklistItem[];

  // Documentation and Final Inspection
  finalInspectionItems: ChecklistItem[];

  // Site Acceptance
  siteAcceptance: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    dateTimeSiteAccepted: string | null; // ISO datetime
  };
}

// ---------------------------------------------------------------------------
// Interface – Top-Level Deployment Checklist
// ---------------------------------------------------------------------------

export interface DeploymentChecklist {
  id: string;
  jobId: string;
  jobDetails: JobDetailsPhaseData;
  preInstallation: PreInstallationPhaseData;
  eodEntries: EodEntry[];
  closeOut: CloseOutPhaseData;
  lastModifiedBy: string;
  lastModifiedAt: string;            // ISO UTC
  createdAt: string;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// Constants – Pre-Installation Checklist Items
// ---------------------------------------------------------------------------

export const PRE_INSTALLATION_ITEMS: ReadonlyArray<{ label: string; playbookReference: string | null }> = [
  { label: 'Required Tickets Opened', playbookReference: null },
  { label: 'Customer Equipment Received', playbookReference: '2.1' },
  { label: 'SRI Materials Received', playbookReference: null },
  { label: 'Documentation Received', playbookReference: null },
  { label: 'Before Pictures Taken', playbookReference: null },
  { label: 'Site Inspection Completed', playbookReference: '1.4' },
  { label: 'Rack Assignments Clear', playbookReference: '1.1' },
  { label: 'Equipment Ports Available', playbookReference: null },
  { label: 'Patch Panel Ports Available', playbookReference: '1.2' },
  { label: 'PDU Assignments Available', playbookReference: '1.3' },
  { label: 'Equipment Orientation Correct', playbookReference: '2.1.3' }
];

// ---------------------------------------------------------------------------
// Constants – Required Pictures (Close-Out Phase)
// ---------------------------------------------------------------------------

export const REQUIRED_PICTURES_ITEMS: ReadonlyArray<{ label: string; category: string }> = [
  // General
  { label: 'Overview of Work Area', category: 'General' },
  { label: 'Design Modifications', category: 'General' },
  { label: 'Equipment Discrepancies', category: 'General' },
  // Rack/Cabinet View
  { label: 'Front Top', category: 'Rack/Cabinet View' },
  { label: 'Front Middle', category: 'Rack/Cabinet View' },
  { label: 'Front Bottom', category: 'Rack/Cabinet View' },
  { label: 'Rear Top', category: 'Rack/Cabinet View' },
  { label: 'Rear Middle', category: 'Rack/Cabinet View' },
  { label: 'Rear Bottom', category: 'Rack/Cabinet View' },
  // Equipment & Patch Panel Detail
  { label: 'Front', category: 'Equipment & Patch Panel Detail' },
  { label: 'Rear', category: 'Equipment & Patch Panel Detail' }
];

// ---------------------------------------------------------------------------
// Constants – Final Inspection Items (Close-Out Phase)
// ---------------------------------------------------------------------------

export const FINAL_INSPECTION_ITEMS: ReadonlyArray<string> = [
  'Site Cleanliness',
  'Workmanship',
  'EDP Updated',
  'Cable Test Results',
  'Label Audit'
];
