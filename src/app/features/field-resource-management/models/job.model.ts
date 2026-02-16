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
  jobId: string; // Business ID
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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
