import { PunchListImages } from './punch-list-images.model';
import { User } from './user.model';

export enum TicketType {
  INFRASTRUCTURE = 'Infrastructure',
  VENDOR_MANAGEMENT = 'Vendor Management',
  ADMINISTRATIVE = 'Administrative',
  EMERGENCY = 'Emergency'
}

export enum TicketPriority {
  P1_CRITICAL = 'P1 - Critical',
  P2_HIGH = 'P2 - High',
  P3_MEDIUM = 'P3 - Medium',
  P4_LOW = 'P4 - Low'
}

export enum TicketSeverity {
  S1_BLOCKER = 'S1 - Blocker',
  S2_MAJOR = 'S2 - Major',
  S3_MINOR = 'S3 - Minor',
  S4_ENHANCEMENT = 'S4 - Enhancement'
}

export enum TicketStatus {
  NEW = 'New',
  ASSIGNED = 'Assigned',
  IN_PROGRESS = 'In Progress',
  PENDING_REVIEW = 'Pending Review',
  ON_HOLD = 'On Hold',
  ESCALATED = 'Escalated',
  RESOLVED = 'Resolved',
  VERIFIED = 'Verified',
  CLOSED = 'Closed',
  REJECTED = 'Rejected',
  REOPENED = 'Reopened',
  ARCHIVED = 'Archived'
}

export interface TicketSLA {
  responseTime: number; // hours
  resolutionTime: number; // hours
  escalationTime: number; // hours
}

export interface TicketCategory {
  id: string;
  area: string;
  category: string;
  subCategory: string;
  errorCode?: string;
  slaConfig: TicketSLA;
}

export interface TicketAssignment {
  id: string;
  ticketId: string;
  assignedTo: string; // User ID
  assignedBy: string; // User ID
  assignedDate: Date;
  role: string; // PM, CM, OSP Coordinator, etc.
  isActive: boolean;
}

export interface TicketStatusHistory {
  id: string;
  ticketId: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  changedBy: string; // User ID
  changedDate: Date;
  reason?: string;
  comments?: string;
}

export interface TicketMetrics {
  responseTime?: number; // actual response time in hours
  resolutionTime?: number; // actual resolution time in hours
  slaCompliance: boolean;
  escalationCount: number;
  reopenCount: number;
}

export class Ticket {
  id: string;
  ticketNumber: string; // Auto-generated unique identifier
  title: string;
  description: string;
  
  // Classification
  type: TicketType;
  priority: TicketPriority;
  severity: TicketSeverity;
  category: TicketCategory;
  
  // Status and Workflow
  status: TicketStatus;
  statusHistory: TicketStatusHistory[];
  
  // Assignment and Ownership
  createdBy: string; // User ID
  assignedTo?: string; // User ID
  assignments: TicketAssignment[];
  
  // Geographic and Project Context
  segmentId?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  vendorName?: string;
  
  // Dates and Timing
  createdDate: Date;
  updatedDate: Date;
  assignedDate?: Date;
  dueDate?: Date;
  resolvedDate?: Date;
  closedDate?: Date;
  
  // SLA and Performance
  slaConfig: TicketSLA;
  metrics: TicketMetrics;
  
  // Content and Attachments
  attachments: PunchListImages[];
  resolutionImages?: PunchListImages[];
  
  // Integration with existing systems
  relatedPunchListId?: string;
  relatedExpenseId?: string;
  
  // Additional fields
  tags: string[];
  customFields: { [key: string]: any };
  
  // Audit trail
  updatedBy?: string;
  resolvedBy?: string;
  verifiedBy?: string;

  constructor(
    id: string,
    ticketNumber: string,
    title: string,
    description: string,
    type: TicketType,
    priority: TicketPriority,
    severity: TicketSeverity,
    category: TicketCategory,
    createdBy: string,
    segmentId?: string,
    streetAddress?: string,
    city?: string,
    state?: string,
    vendorName?: string
  ) {
    this.id = id;
    this.ticketNumber = ticketNumber;
    this.title = title;
    this.description = description;
    this.type = type;
    this.priority = priority;
    this.severity = severity;
    this.category = category;
    this.status = TicketStatus.NEW;
    this.statusHistory = [];
    this.createdBy = createdBy;
    this.assignments = [];
    this.segmentId = segmentId;
    this.streetAddress = streetAddress;
    this.city = city;
    this.state = state;
    this.vendorName = vendorName;
    this.createdDate = new Date();
    this.updatedDate = new Date();
    this.slaConfig = this.calculateSLA();
    this.metrics = {
      slaCompliance: true,
      escalationCount: 0,
      reopenCount: 0
    };
    this.attachments = [];
    this.tags = [];
    this.customFields = {};
  }

  private calculateSLA(): TicketSLA {
    // SLA calculation based on priority
    switch (this.priority) {
      case TicketPriority.P1_CRITICAL:
        return { responseTime: 1, resolutionTime: 4, escalationTime: 2 };
      case TicketPriority.P2_HIGH:
        return { responseTime: 4, resolutionTime: 24, escalationTime: 12 };
      case TicketPriority.P3_MEDIUM:
        return { responseTime: 8, resolutionTime: 72, escalationTime: 48 };
      case TicketPriority.P4_LOW:
        return { responseTime: 24, resolutionTime: 168, escalationTime: 120 }; // 1 week
      default:
        return { responseTime: 8, resolutionTime: 72, escalationTime: 48 };
    }
  }

  // Helper methods
  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && !this.isResolved();
  }

  isResolved(): boolean {
    return [TicketStatus.RESOLVED, TicketStatus.VERIFIED, TicketStatus.CLOSED].includes(this.status);
  }

  isClosed(): boolean {
    return [TicketStatus.CLOSED, TicketStatus.ARCHIVED].includes(this.status);
  }

  canTransitionTo(newStatus: TicketStatus): boolean {
    const validTransitions: { [key in TicketStatus]: TicketStatus[] } = {
      [TicketStatus.NEW]: [TicketStatus.ASSIGNED, TicketStatus.REJECTED],
      [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.ON_HOLD, TicketStatus.ESCALATED],
      [TicketStatus.IN_PROGRESS]: [TicketStatus.PENDING_REVIEW, TicketStatus.ON_HOLD, TicketStatus.ESCALATED, TicketStatus.RESOLVED],
      [TicketStatus.PENDING_REVIEW]: [TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED],
      [TicketStatus.ON_HOLD]: [TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED],
      [TicketStatus.ESCALATED]: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
      [TicketStatus.RESOLVED]: [TicketStatus.VERIFIED, TicketStatus.REOPENED],
      [TicketStatus.VERIFIED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
      [TicketStatus.CLOSED]: [TicketStatus.REOPENED, TicketStatus.ARCHIVED],
      [TicketStatus.REJECTED]: [TicketStatus.NEW],
      [TicketStatus.REOPENED]: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS],
      [TicketStatus.ARCHIVED]: []
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
  }

  getAge(): number {
    return Math.floor((new Date().getTime() - this.createdDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  getTimeToResolution(): number | null {
    if (!this.resolvedDate) return null;
    return Math.floor((this.resolvedDate.getTime() - this.createdDate.getTime()) / (1000 * 60 * 60));
  }
}

// Dashboard and reporting models
export interface TicketStats {
  total: number;
  byStatus: { [key in TicketStatus]: number };
  byPriority: { [key in TicketPriority]: number };
  byType: { [key in TicketType]: number };
  overdue: number;
  slaCompliant: number;
  avgResolutionTime: number;
}

export interface TicketTrend {
  date: string;
  created: number;
  resolved: number;
  backlog: number;
}

export interface VendorTicketPerformance {
  vendorName: string;
  totalTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  slaCompliance: number;
  escalationRate: number;
}

export interface UserTicketWorkload {
  userId: string;
  userName: string;
  assignedTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  workloadScore: number;
}

