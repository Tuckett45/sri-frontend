export type Id = string;

/* -------------------------
   Deployment Status Enum
-------------------------- */
export enum DeploymentStatus {
  Planned = 'Planned',
  Survey = 'Site Survey',
  Inventory = 'Inventory',
  Install = 'Install',
  Cabling = 'Cabling',
  Labeling = 'Labeling',
  Handoff = 'Handoff',
  Complete = 'Complete'
}

/* -------------------------
   Phase State Enum
-------------------------- */
export type PhaseState = 'Pending' | 'InProgress' | 'Complete';

/* ============================================================
   Deployment Roles
   ============================================================ */
export enum DeploymentRole {
  DeploymentEngineer = 'Deployment Engineer',
  DCOps = 'DC Ops',
  VendorRep = 'Vendor Rep',
  SRITech = 'SRI Tech'
}

/* ============================================================
   Deployments (dbo.Deployments)
   ============================================================ */
export interface Deployment {
  id: Id;
  name: string;
  dataCenter: string;
  vendorName: string;
  deploymentEngineerId?: string;
  dcOpsId?: string;
  vendorRepId?: string;
  sriTechId?: string;
  assignedUserId?: string; // Currently assigned user for this phase
  assignedRole?: DeploymentRole; // Currently assigned role for this phase
  status: DeploymentStatus;
  startDate?: string;
  targetHandoffDate?: string;
  rfpId?: string;
  workOrderId?: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
  progressPercent?: number;
  nextStatus?: DeploymentStatus | null;
  // Sign-off fields
  vendorSignedBy?: string;
  vendorSignedAt?: string;
  deSignedBy?: string;
  deSignedAt?: string;
  techSignedBy?: string;
  techSignedAt?: string;
  isFullySignedOff?: boolean;
}

/* ============================================================
   Deployment Assets (dbo.DeploymentAssets)
   ============================================================ */
export interface DeploymentAsset {
  id: Id;
  deploymentId: Id;
  hostname: string;
  serialNumber?: string;
  rack?: string;
  ru?: number;
  slot?: string;
  metadataJson?: string; // backend stores serialized JSON
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

/* ============================================================
   Deployment Phases (dbo.DeploymentPhases)
   ============================================================ */
export interface DeploymentPhase {
  id: Id;
  deploymentId: Id;
  phaseCode: number;      // 1..6
  name: string;
  status: PhaseState;
  startedDate?: string;
  completedDate?: string;
}

/* ============================================================
   Deployment SubPhases (dbo.DeploymentSubPhases)
   ============================================================ */
export interface DeploymentSubPhase {
  id: Id;
  deploymentId: Id;
  phaseCode: number;
  subCode: string;        // e.g. "1.1", "2.1.4"
  title: string;
  required: boolean;
  status: PhaseState;
  completedDate?: string;
}

/* ============================================================
   Checklist (Template + Answers)
   ============================================================ */

/** Input control types used by the template/view model */
export type ChecklistInputType =
  | 'checkbox'
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'date'
  | 'photo'
  | 'file';

/** UI option shape for select/radio controls */
export interface ChecklistOption {
  label: string;
  value: string | number;
}

/** UI model used by components/forms */
export interface ChecklistItem {
  id: Id;                       // = itemKey
  label: string;
  type: ChecklistInputType;     // from template
  required?: boolean;
  description?: string;
  notes?: string | null;
  options?: ChecklistOption[];
  placeholder?: string;
  evidenceIds?: string[];
  value?: unknown;
  passed?: boolean | null;
}

/** READ model returned by API (template + current answer merged) */
export interface ChecklistItemVm {
  itemKey: string;
  label: string;
  controlType: ChecklistInputType; // <- use for rendering inputs
  optionsJson?: string | null;     // JSON string (ChecklistOption[])
  placeholder?: string | null;
  required: boolean;
  value?: string | null;           // current saved value (stringified)
  passed?: boolean | null;
  notes?: string | null;
}

/** WRITE DTO sent to API when saving answers */
export interface ChecklistItemDto {
  itemKey: string;                // from ChecklistItem.id
  label: string;
  value?: string | null;
  required: boolean;
  passed?: boolean | null;
  notes?: string | null;
}

/* ============================================================
   Media (dbo.DeploymentMedia)
   ============================================================ */
export interface DeploymentMedia {
  id: Id;
  deploymentId: Id;
  phaseCode?: number;
  subCode?: string;
  mediaType: string;      // e.g. "DeviceFront", "FlukeDTX"
  kind: 'Photo' | 'File';
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  uploadedBy?: string;
  uploadedAt: string;
  hash?: string;
  metadataJson?: string;
}

/* ============================================================
   Evidence (dbo.DeploymentEvidence)
   ============================================================ */
export interface DeploymentEvidence {
  id: Id;
  deploymentId: Id;
  phaseCode: number;
  subCode: string;
  evidenceType: 'Photo' | 'File';
  kind: string;
  mediaId: Id;
  createdDate: string;
}

/* ============================================================
   Handoff Package (dbo.DeploymentHandoff)
   ============================================================ */
export interface DeploymentHandoff {
  id: Id;
  deploymentId: Id;
  vendorSignedBy?: string;
  vendorSignedAt?: string;
  deSignedBy?: string;
  deSignedAt?: string;
  packageUrl?: string;
  asBuiltMediaId?: string;
  portTestMediaId?: string;
  requiredPhotosJson?: string;
  createdDate: string;
  updatedDate?: string;
}

/** Convenience FE package shape (optional; maps to DeploymentHandoff) */
export interface HandoffPackage {
  id: Id;
  deploymentId: Id;
  requiredPhotos: string[];
  asBuiltFileId?: string | null;
  portTestFileId?: string | null;
  signedVendorBy?: string | null;
  signedVendorAt?: string | null;
  signedDeBy?: string | null;
  signedDeAt?: string | null;
  packageUrl?: string | null;
}

/* ============================================================
   Aggregated UI Models (Phases + Checklist)
   ============================================================ */
export interface PhaseRun {
  id: Id;
  deploymentId: Id;
  phaseCode: number;
  name: string;
  status: PhaseState;
  startedAt?: string;
  completedAt?: string;
  checklist?: ChecklistItemDto[]; // when saving, send DTO[]
}

export interface Photo {
  id: Id;
  deploymentId: Id;
  phaseCode: number;
  subCode?: string;
  mediaType?: string;
  url: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: Id;
}

export interface TestResult {
  id: Id;
  deploymentId: Id;
  phaseCode: number;
  subCode?: string;
  mediaType?: string;
  name: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: Id;
}

/* ============================================================
   Punch Items (placeholder for future expansion)
   ============================================================ */
export interface PunchItem {
  id: Id;
  deploymentId: Id;
  phaseCode: number;
  description: string;
  owner: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}
