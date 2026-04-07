import { WorkOrderStatus, WorkOrderPriority } from './technician-status.enum';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceAddress: ServiceAddress;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date;
  acknowledgedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  slaDeadline: Date;
  slaType: string;
  isOverdue: boolean;
  requiresEscalation: boolean;
  escalatedAt?: Date;
  notes?: string;
  attachments?: WorkOrderAttachment[];
}

export interface ServiceAddress {
  street: string;
  city: string;
  state: string;
  zipcode: string;
  latitude?: number;
  longitude?: number;
}

export interface WorkOrderAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface WorkOrderListItem {
  id: string;
  title: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  customerName: string;
  address: string;
  assignedTechnicianName?: string;
  slaDeadline: Date;
  isOverdue: boolean;
  minutesUntilDue: number;
}

export interface CreateWorkOrderRequest {
  title: string;
  description: string;
  priority: WorkOrderPriority;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceAddress: ServiceAddress;
  dueDate?: Date;
  notes?: string;
}

export interface UpdateWorkOrderRequest {
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
  status?: WorkOrderStatus;
  notes?: string;
}

export enum SlaType {
  MTTA_4_HOUR = 'MTTA_4_HOUR',
  COMPLETION_24_HOUR = 'COMPLETION_24_HOUR',
  COMPLETION_5_DAY = 'COMPLETION_5_DAY'
}
