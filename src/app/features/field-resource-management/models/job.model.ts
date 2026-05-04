/**
 * Job-related models and enums for Field Resource Management
 */

import { Skill } from './technician.model';

export enum JobType {
  Install = 'Install',
  Decom = 'Decom',
  SiteSurvey = 'SiteSurvey',
  PM = 'PM'
}

export enum Priority {
  P1 = 'P1',
  P2 = 'P2',
  Normal = 'Normal'
}

export enum JobStatus {
  NotStarted = 'NotStarted',
  EnRoute = 'EnRoute',
  OnSite = 'OnSite',
  Completed = 'Completed',
  Issue = 'Issue',
  Cancelled = 'Cancelled'
}

export enum JobReadiness {
  Not_Ready = 'Not_Ready',
  Partially_Ready = 'Partially_Ready',
  Ready = 'Ready'
}

export enum CustomerReady {
  Not_Ready = 'Not_Ready',
  Ready = 'Ready'
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  blobUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface JobNote {
  id: string;
  jobId: string;
  text: string;
  author: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Job {
  id: string;
  jobId: string; // Business ID / Title
  title?: string;
  client: string;
  siteName: string;
  siteAddress: Address;
  jobType: JobType;
  priority: Priority;
  status: JobStatus;
  scopeDescription: string;
  requiredSkills: Skill[];
  requiredCrewSize: number;
  estimatedLaborHours: number;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  customerPOC?: ContactInfo;
  attachments: Attachment[];
  notes: JobNote[];
  region?: string;
  market: string;
  company: string;
  technicianId?: string;
  crewId?: string;
  templateId?: string;

  // Pricing / Billing
  authorizationStatus?: string;
  hasPurchaseOrders?: boolean;
  purchaseOrderNumber?: string;
  standardBillRate?: number;
  overtimeBillRate?: number;
  perDiem?: number;
  invoicingProcess?: string;

  // SRI Internal
  projectDirector?: string;
  targetResources?: number;
  bizDevContact?: string;
  requestedHours?: number;
  overtimeRequired?: boolean;
  estimatedOvertimeHours?: number;

  // Job Readiness
  jobReadiness?: JobReadiness;
  customerReady?: CustomerReady;

  // Quote Workflow Reference
  quoteWorkflowId?: string;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
