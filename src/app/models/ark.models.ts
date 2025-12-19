export interface Technician {
  technicianId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  employeeId?: string;
  hireDate: Date;
  employmentStatus: string;
  department?: string;
  homeBase?: string;
  currentLocation?: string;
  assignedRegion?: string;
  weeklyHours: number;
  currentUtilization: number;
  isAvailable: boolean;
  availabilityNotes?: string;
  completedJobs: number;
  averageRating?: number;
  onTimeCompletionRate?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profileImageUrl?: string;
  fullName: string;
  isActive: boolean;
}

export interface CreateTechnicianDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  employeeId?: string;
  hireDate: Date;
  department?: string;
  homeBase?: string;
  assignedRegion?: string;
}

export interface UpdateTechnicianDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  employmentStatus?: string;
  department?: string;
  homeBase?: string;
  currentLocation?: string;
  assignedRegion?: string;
  isAvailable?: boolean;
  availabilityNotes?: string;
}

export interface Job {
  jobId: number;
  jobNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  jobTitle: string;
  jobDescription?: string;
  jobType: string;
  priority: string;
  siteAddress: string;
  siteCity?: string;
  latitude?: number;
  longitude?: number;
  requestedStartDate?: Date;
  requestedCompletionDate?: Date;
  requiredTechnicians: number;
  status: string;
  completionPercentage: number;
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  isOpen: boolean;
  isCompleted: boolean;
}

export interface CreateJobDto {
  jobNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  jobTitle: string;
  jobDescription?: string;
  jobType: string;
  priority: string;
  siteAddress: string;
  siteCity?: string;
  latitude?: number;
  longitude?: number;
  requestedStartDate?: Date;
  requestedCompletionDate?: Date;
  requiredTechnicians: number;
  estimatedCost?: number;
}

export interface UpdateJobDto {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  jobTitle?: string;
  jobDescription?: string;
  jobType?: string;
  priority?: string;
  siteAddress?: string;
  siteCity?: string;
  latitude?: number;
  longitude?: number;
  requestedStartDate?: Date;
  requestedCompletionDate?: Date;
  requiredTechnicians?: number;
  status?: string;
  completionPercentage?: number;
  estimatedCost?: number;
}

export interface WorkOrder {
  workOrderId: number;
  workOrderNumber: string;
  jobId: number;
  assignedTechnicianId?: number;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  status: string;
  completionPercentage: number;
  workDescription?: string;
}
