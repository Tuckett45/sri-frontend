import { WorkOrderStatus } from './technician-status.enum';
import { WorkOrder } from './work-order.model';
import { Technician } from './technician.model';

export interface Assignment {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  technicianId: string;
  technician?: Technician;
  assignedAt: Date;
  acknowledgedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: WorkOrderStatus;
  isAcknowledged: boolean;
  requiresAcknowledgement: boolean;
  slaDeadline: Date;
  isOverdue: boolean;
  estimatedDuration?: number;
  actualDuration?: number;
  notes?: string;
  dispatcherNotes?: string;
}

export interface CreateAssignmentRequest {
  workOrderId: string;
  technicianId: string;
  estimatedDuration?: number;
  dispatcherNotes?: string;
}

export interface UpdateAssignmentRequest {
  status?: WorkOrderStatus;
  notes?: string;
}

export interface AcknowledgeAssignmentRequest {
  assignmentId: string;
  acknowledgedAt: Date;
  estimatedArrivalTime?: Date;
}

export interface AssignmentStatusUpdate {
  assignmentId: string;
  status: WorkOrderStatus;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  photoUrl?: string;
}

export interface ReassignAssignmentRequest {
  technicianId: string;
}
