export enum JobStatus {
  NotStarted = 'NotStarted',
  EnRoute = 'EnRoute',
  OnSite = 'OnSite',
  Completed = 'Completed',
  Issue = 'Issue'
}

export enum JobPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent'
}

export enum AssignmentStatus {
  Assigned = 'Assigned',
  Accepted = 'Accepted',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum ProficiencyLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Expert = 'Expert'
}

export enum EmploymentStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  OnLeave = 'OnLeave'
}

export interface SkillSummary {
  skillId: string;
  skillName: string;
  category: string;
  proficiencyLevel: ProficiencyLevel;
}

export interface CertificationSummary {
  certificationId: string;
  certificationName: string;
  expirationDate?: string;
  isExpired: boolean;
}

export interface Technician {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  employmentStatus: EmploymentStatus;
  skills: SkillSummary[];
  certifications: CertificationSummary[];
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillRequirement {
  skillId: string;
  skillName: string;
  minimumProficiency: ProficiencyLevel;
  isRequired: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  priority: JobPriority;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode?: string;
  deploymentId?: string;
  skillRequirements: SkillRequirement[];
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyJobItem {
  jobId: string;
  assignmentId: string;
  title: string;
  description: string;
  status: JobStatus;
  priority: JobPriority;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  streetAddress: string;
  city: string;
  state: string;
  assignmentStatus: AssignmentStatus;
  skillRequirements: SkillRequirement[];
  estimatedHours?: number;
}

export interface DailyJobsResponse {
  technicianId: string;
  date: string;
  jobs: DailyJobItem[];
}

export interface JobListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: Job[];
}

export interface TechnicianListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: Technician[];
}

export interface JobStatusUpdateRequest {
  newStatus: JobStatus;
  changedBy: string;
  technicianId?: string;
  notes?: string;
}

export interface JobQueryParams {
  status?: JobStatus;
  priority?: JobPriority;
  technicianId?: string;
  deploymentId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface TechnicianQueryParams {
  employmentStatus?: EmploymentStatus;
  skillId?: string;
  page?: number;
  pageSize?: number;
}
