/**
 * Models for Job Documentation Import feature.
 *
 * Represents the structured data extracted from uploaded job documentation
 * (one-pagers, SOWs, etc.) that can be used to pre-populate the Job Setup form.
 */

// ---------------------------------------------------------------------------
// Parsed Document Result
// ---------------------------------------------------------------------------

export interface ParsedJobDocument {
  /** Client/company name extracted from the document */
  clientName?: string;

  /** Job site name or project name */
  siteName?: string;

  /** Site address components */
  siteAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };

  /** Customer point of contact */
  customerPOC?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  /** Scope of work description */
  scopeOfWork?: string;

  /** Work schedule description (e.g., "6/10s Monday – Saturday") */
  workSchedule?: string;

  /** Per diem amount (numeric, per day) */
  perDiem?: number;

  /** Per diem rules/tiers as described in the document */
  perDiemRules?: PerDiemTier[];

  /** Site lead / project director info */
  siteLead?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  /** Required PPE items */
  requiredPPE?: string[];

  /** Required tools */
  requiredTools?: string[];

  /** Safety rules summary */
  safetyNotes?: string;

  /** Payroll information */
  payroll?: {
    payFrequency?: string;
    timesheetDeadline?: string;
    phaseCodes?: PhaseCode[];
  };

  /** PTO / banked time rules */
  ptoRules?: string;

  /** Holiday pay info */
  holidayPay?: string;

  /** Key contacts extracted from the document */
  contacts?: DocumentContact[];

  /** Orientation details */
  orientation?: {
    address?: string;
    arrivalTime?: string;
  };

  /** Work attire requirements */
  workAttire?: string;

  /** Raw text content (for reference) */
  rawText?: string;

  /** Confidence score from the parser (0-1) */
  confidence?: number;
}

export interface PerDiemTier {
  distanceRange: string;   // e.g., "0-60 miles", "90+ miles"
  amount: number;
  frequency: string;       // e.g., "per day worked", "per overnight stay"
  notes?: string;
}

export interface PhaseCode {
  description: string;     // e.g., "Daily Work", "Mob in"
  code: string;            // e.g., "410"
  jobNumber?: string;      // e.g., "46437"
  type?: string;           // e.g., "R", "V", "SR"
}

export interface DocumentContact {
  role: string;            // e.g., "Human Resources", "Payroll", "Site Lead"
  name: string;
  email?: string;
  phone?: string;
}

// ---------------------------------------------------------------------------
// Import Request / Response
// ---------------------------------------------------------------------------

export interface ImportDocumentRequest {
  file: File;
  jobId?: string;          // If importing into an existing job
}

export interface ImportDocumentResponse {
  success: boolean;
  parsed: ParsedJobDocument;
  warnings?: string[];     // Any parsing issues or low-confidence fields
  documentId?: string;     // Reference to stored document
}
