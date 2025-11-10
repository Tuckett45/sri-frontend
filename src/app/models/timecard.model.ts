// TimeCard Status enum
export enum TimeCardStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

// Individual time entry for a specific date
export interface TimeCardEntry {
  id?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  hours: number;
  jobCode?: string;
  projectId?: string;
  notes?: string;
  expenseIds?: string[]; // Linked expense IDs
}

// Main TimeCard interface
export interface TimeCard {
  id?: string;
  userId: string;
  userName?: string;
  weekEnding: string; // ISO date string for end of week (typically Sunday or Saturday)
  entries: TimeCardEntry[];
  status: TimeCardStatus;
  totalHours?: number;
  createdDate?: string;
  updatedDate?: string;
  submittedDate?: string;
  approvedDate?: string;
  approvedBy?: string;
  rejectedDate?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

// TimeCard list item for table display
export interface TimeCardListItem {
  id: string;
  userId: string;
  userName: string;
  weekEnding: string;
  status: TimeCardStatus;
  totalHours: number;
  createdDate: string;
  submittedDate?: string;
  approvedDate?: string;
  jobCodes?: string[]; // Unique job codes in this timecard
  projectIds?: string[]; // Unique project IDs in this timecard
}

// Paginated response for timecard lists
export interface TimeCardListResponse {
  page: number;
  pageSize: number;
  total?: number;
  items: TimeCardListItem[];
}

// Smart suggestions for auto-population
export interface TimeCardSuggestion {
  jobCode: string;
  projectId?: string;
  averageHours: number;
  frequency: number; // How often user works on this
  lastUsed?: string; // Last date used
}

// User history summary for suggestions
export interface TimeCardHistorySummary {
  userId: string;
  recentJobs: TimeCardSuggestion[];
  weeklyPattern?: TimeCardEntry[]; // Suggested weekly pattern for salary employees
  isSalaryEmployee?: boolean; // Detected from consistent patterns
  averageWeeklyHours?: number;
}

// Request parameters for searching/filtering timecards
export interface TimeCardSearchParams {
  page?: number;
  pageSize?: number;
  includeEntries?: boolean;
  userId?: string;
  userName?: string;
  status?: TimeCardStatus;
  from?: string; // ISO date string
  to?: string; // ISO date string
  jobCode?: string;
  projectId?: string;
}

// Request for creating/updating timecard
export interface TimeCardRequest {
  userId: string;
  weekEnding: string;
  entries: TimeCardEntry[];
  status?: TimeCardStatus;
}

// Response for timecard operations
export interface TimeCardResponse {
  success: boolean;
  message?: string;
  timecard?: TimeCard;
  error?: string;
}

// Dashboard statistics
export interface TimeCardDashboardStats {
  totalPendingApprovals: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  activeEmployees: number;
  recentSubmissions: TimeCardListItem[];
  hoursByProject: { projectId: string; hours: number; }[];
  hoursByEmployee: { userId: string; userName: string; hours: number; }[];
  weeklyTrend: { weekEnding: string; hours: number; }[];
}

