export type Id = string;

export enum DeploymentStatus {
  Planned = 'Planned',
  Survey = 'Survey',
  Inventory = 'Inventory',
  Install = 'Install',
  Cabling = 'Cabling',
  Labeling = 'Labeling',
  Handoff = 'Handoff',
  Complete = 'Complete'
}

export interface DeploymentProject {
  id: Id;
  name: string;
  dataCenter: string;
  vendor: string;
  status: DeploymentStatus;
  assignedVendorIds?: Id[];
  startDate?: string;
  targetCompletion?: string;
  metadata?: Record<string, unknown>;
}

export type ChecklistItemType =
  | 'checkbox'
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'date'
  | 'photo'
  | 'file';

export interface ChecklistOption {
  label: string;
  value: string | number;
}

export interface ChecklistItem {
  id: Id;
  label: string;
  description?: string;
  required?: boolean;
  type: ChecklistItemType;
  options?: ChecklistOption[];
  placeholder?: string;
  evidenceIds?: string[];
  value?: unknown;
}

export interface PhaseRun {
  id: Id;
  projectId: Id;
  status: DeploymentStatus;
  startedAt: string;
  completedAt?: string;
  checklist?: ChecklistItem[];
}

export interface DeploymentAsset {
  id: Id;
  projectId: Id;
  hostname: string;
  serialNumber?: string;
  rack?: string;
  ru?: number;
  slot?: string;
  metadata?: Record<string, unknown>;
}

export interface Photo {
  id: Id;
  projectId: Id;
  phase: DeploymentStatus;
  url: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: Id;
}

export interface TestResult {
  id: Id;
  projectId: Id;
  phase: DeploymentStatus;
  name: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: Id;
}

export interface PunchItem {
  id: Id;
  projectId: Id;
  phase: DeploymentStatus;
  description: string;
  owner: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface HandoffPackage {
  id: Id;
  projectId: Id;
  signedVendorBy?: string;
  signedVendorAt?: string;
  signedDeBy?: string;
  signedDeAt?: string;
  packageUrl?: string;
  requiredPhotos: string[];
  asBuiltFileId?: string;
  portTestFileId?: string;
}
