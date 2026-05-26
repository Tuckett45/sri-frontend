/**
 * Atlas Platform Lifecycle Models
 *
 * TypeScript interfaces matching the DTOs from the sri-project-lifecycle-api backend.
 * These models support the full project lifecycle, cost management, performance metrics,
 * and integration hub capabilities.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────────

export enum ProjectPhase {
  INITIATING = 1,
  PLANNING = 2,
  EXECUTING = 3,
  MONITORING_CONTROLLING = 4,
  EXECUTING_MONITORING = 5,
  CLOSE = 6,
  ON_HOLD = 7,
  CANCELLED = 8
}

export enum ProjectStatus {
  NOT_STARTED = 0,
  ACTIVE = 1,
  COMPLETED = 2,
  ON_HOLD = 3,
  CANCELLED = 4
}

export enum ActivityStatus {
  NOT_STARTED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  BLOCKED = 3,
  CANCELLED = 4
}

export enum ActivityType {
  TASK = 0,
  MILESTONE = 1,
  GATE = 2,
  REVIEW = 3,
  APPROVAL = 4
}

export enum TransitionStatus {
  PENDING = 0,
  APPROVED = 1,
  COMPLETED = 2,
  REJECTED = 3,
  CANCELLED = 4
}

export enum MilestoneStatus {
  PLANNED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  MISSED = 3,
  CANCELLED = 4
}

export enum DocumentStatus {
  DRAFT = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  REJECTED = 3,
  ARCHIVED = 4
}

// ─── Project DTOs ───────────────────────────────────────────────────────────────

export interface ProjectDto {
  id: string;
  projectName: string;
  rfpNumber: string;
  currentPhase: ProjectPhase;
  status: ProjectStatus;
  clientId: string;
  projectManagerId: string;
  createdAt: string;
  updatedAt: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  budgetAmount: number;
  actualCost: number;
}

export interface ProjectDetailDto extends ProjectDto {
  projectMetadata: Record<string, any>;
  phaseHistory: PhaseTransitionDto[];
  activities: ActivityDto[];
  documents: DocumentDto[];
  milestones: MilestoneDto[];
}

export interface ProjectListResponse {
  projects: ProjectDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ─── Phase Transition ───────────────────────────────────────────────────────────

export interface PhaseTransitionDto {
  id: string;
  fromPhase: ProjectPhase;
  toPhase: ProjectPhase;
  initiatedBy: string;
  requestedAt: string;
  completedAt?: string;
  status: TransitionStatus;
  reason: string;
}

export interface PhaseTransitionRequest {
  targetPhase: ProjectPhase;
  reason: string;
  initiatedBy: string;
}

export interface PhaseTransitionResult {
  projectId: string;
  previousPhase: ProjectPhase;
  newPhase: ProjectPhase;
  transitionedAt: string;
  reason: string;
}

// ─── Activity & Checklist ───────────────────────────────────────────────────────

export interface ActivityDto {
  id: string;
  phase: ProjectPhase;
  activityName: string;
  description: string;
  type: ActivityType;
  status: ActivityStatus;
  assignedTo?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  isRequired: boolean;
}

export interface PhaseChecklist {
  projectId: string;
  phase: ProjectPhase;
  activities: ChecklistActivity[];
}

export interface ChecklistActivity {
  id: string;
  name: string;
  description: string;
  type: ActivityType;
  status: ActivityStatus;
  isRequired: boolean;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  dependencies: string[];
}

export interface CompleteActivityRequest {
  completedBy: string;
  evidence: string[];
  notes?: string;
}

// ─── Documents ──────────────────────────────────────────────────────────────────

export interface DocumentDto {
  id: string;
  phase: ProjectPhase;
  type: string;
  title: string;
  description: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  status: DocumentStatus;
  version: number;
}

// ─── Milestones ─────────────────────────────────────────────────────────────────

export interface MilestoneDto {
  id: string;
  phase: ProjectPhase;
  milestoneName: string;
  description: string;
  type: string;
  plannedDate: string;
  actualDate?: string;
  status: MilestoneStatus;
  isCriticalPath: boolean;
}

// ─── Performance Metrics ────────────────────────────────────────────────────────

export interface PerformanceMetrics {
  projectId: string;
  schedulePerformanceIndex: number;
  costPerformanceIndex: number;
  onTimeDeliveryRate: number;
  budgetVariancePercentage: number;
  scheduleVariancePercentage: number;
  bottlenecks: string[];
  calculatedAt: string;
}

// ─── Cost Management ────────────────────────────────────────────────────────────

export interface CostAnalysisReport {
  projectId: string;
  budgetAmount: number;
  actualCost: number;
  budgetVariance: number;
  budgetVariancePercentage: number;
  expensesByCategory: Record<string, number>;
  costTrend: CostTrendEntry[];
  estimateAtCompletion: number;
  estimateToComplete: number;
  profitMargin: number;
}

export interface CostTrendEntry {
  date: string;
  cumulativeCost: number;
  plannedCost: number;
}

export interface BudgetBaseline {
  projectId: string;
  totalBudget: number;
  categoryBudgets: Record<string, number>;
  establishedAt: string;
  version: number;
  isActive: boolean;
}

export interface CostOverrunAlert {
  projectId: string;
  budgetAmount: number;
  actualCost: number;
  overrunAmount: number;
  overrunPercentage: number;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
}

// ─── Resource Utilization ───────────────────────────────────────────────────────

export interface ResourceUtilizationReport {
  startDate: string;
  endDate: string;
  overallUtilization: number;
  utilizationByType: Record<string, number>;
  utilizationByProject: ResourceProjectUtilization[];
}

export interface ResourceProjectUtilization {
  projectId: string;
  projectName: string;
  allocatedResources: number;
  utilizedResources: number;
  utilizationPercentage: number;
}

// ─── Dashboard Data ─────────────────────────────────────────────────────────────

export interface ProjectStatusReport {
  generatedAt: string;
  totalProjects: number;
  projectsByPhase: Record<string, number>;
  projectsByStatus: Record<string, number>;
  totalBudget: number;
  totalActualCost: number;
  averageBudgetVariance: number;
  projectsOnSchedule: number;
  projectsDelayed: number;
  projectSummaries: ProjectSummary[];
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  rfpNumber: string;
  currentPhase: ProjectPhase;
  status: ProjectStatus;
  completionPercentage: number;
  budgetVariance: number;
  isOnSchedule: boolean;
}

export interface RealTimeProjectStatus {
  projectId: string;
  projectName: string;
  currentPhase: ProjectPhase;
  status: ProjectStatus;
  lastUpdated: string;
  completionPercentage: number;
  currentActivity: string;
  openIssuesCount: number;
  hasCostOverrun: boolean;
  isDelayed: boolean;
}

// ─── Historical Analysis ────────────────────────────────────────────────────────

export interface HistoricalAnalysisReport {
  timeframe: number;
  projectType?: string;
  totalProjectsAnalyzed: number;
  averageDuration: number;
  averageBudgetVariance: number;
  onTimeDeliveryRate: number;
  costEfficiency: number;
  trends: TrendData[];
  recommendations: string[];
}

export interface TrendData {
  period: string;
  metric: string;
  value: number;
}

// ─── Integration Hub ────────────────────────────────────────────────────────────

export interface CreateSpectrumJobRequest {
  projectId: string;
  jobData: Record<string, any>;
}

export interface SpectrumJobResult {
  projectId: string;
  jobNumber: string;
  status: string;
  createdAt: string;
}

export interface SubmitProcurementOrderRequest {
  projectId: string;
  orderData: Record<string, any>;
}

export interface ProcurementOrderResult {
  projectId: string;
  orderNumber: string;
  status: string;
  submittedAt: string;
}

export interface BookTravelRequest {
  projectId: string;
  travelData: Record<string, any>;
}

export interface TravelBookingResult {
  projectId: string;
  bookingReference: string;
  status: string;
  bookedAt: string;
}

export interface ProcessInvoiceRequest {
  projectId: string;
  invoiceData: Record<string, any>;
}

export interface InvoiceResult {
  projectId: string;
  invoiceNumber: string;
  status: string;
  processedAt: string;
}

export interface IntegrationHealthStatus {
  overallStatus: string;
  integrations: IntegrationStatus[];
}

export interface IntegrationStatus {
  name: string;
  status: string;
  lastChecked: string;
  responseTime?: number;
}

// ─── Audit Trail ────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  actorId: string;
  actorType: string;
  action: string;
  eventData: Record<string, any>;
  correlationId?: string;
}

// ─── Labor Summary (from Atlas Core API) ────────────────────────────────────────

export interface LaborSummary {
  jobId: string;
  totalHours: number;
  totalMileage: number;
  technicianCount: number;
  estimatedHours: number;
  variance: number;
}
