/**
 * Data Transfer Objects for Job API requests
 */

import { JobType, Priority, JobStatus, Address, ContactInfo } from '../job.model';
import { Skill } from '../technician.model';

export interface CreateJobDto {
  client: string;
  siteName: string;
  siteAddress: Address;
  jobType: JobType;
  priority: Priority;
  scopeDescription: string;
  requiredSkills: Skill[];
  requiredCrewSize: number;
  estimatedLaborHours: number;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  customerPOC?: ContactInfo;

  // Pricing/Billing fields (Job Setup Workflow)
  authorizationStatus: 'authorized' | 'pending';
  hasPurchaseOrders: boolean;
  purchaseOrderNumber?: string;
  standardBillRate: number;
  overtimeBillRate: number;
  perDiem: number;
  invoicingProcess: 'weekly' | 'bi-weekly' | 'monthly' | 'per-milestone' | 'upon-completion';

  // SRI Internal fields (Job Setup Workflow)
  projectDirector: string;
  targetResources: number;
  bizDevContact: string;
  requestedHours: number;
  overtimeRequired: boolean;
  estimatedOvertimeHours?: number;
}

export interface UpdateJobDto {
  client?: string;
  siteName?: string;
  siteAddress?: Address;
  jobType?: JobType;
  priority?: Priority;
  status?: JobStatus;
  scopeDescription?: string;
  requiredSkills?: Skill[];
  requiredCrewSize?: number;
  estimatedLaborHours?: number;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  customerPOC?: ContactInfo;

  // Pricing/Billing fields (Job Setup Workflow)
  authorizationStatus?: 'authorized' | 'pending';
  hasPurchaseOrders?: boolean;
  purchaseOrderNumber?: string;
  standardBillRate?: number;
  overtimeBillRate?: number;
  perDiem?: number;
  invoicingProcess?: 'weekly' | 'bi-weekly' | 'monthly' | 'per-milestone' | 'upon-completion';

  // SRI Internal fields (Job Setup Workflow)
  projectDirector?: string;
  targetResources?: number;
  bizDevContact?: string;
  requestedHours?: number;
  overtimeRequired?: boolean;
  estimatedOvertimeHours?: number;
}
