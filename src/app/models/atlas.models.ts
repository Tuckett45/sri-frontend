/**
 * Atlas Platform Models
 *
 * TypeScript mirror of the Atlas backend domain types.
 * Matches atlas-core/Domain/Enums and atlas-api DTOs exactly.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum AtlasLifecycleState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  INTAKE_REVIEW = 'INTAKE_REVIEW',
  PLANNING = 'PLANNING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  EXECUTION_COMPLETE = 'EXECUTION_COMPLETE',
  QA_REVIEW = 'QA_REVIEW',
  APPROVED_FOR_CLOSEOUT = 'APPROVED_FOR_CLOSEOUT',
  CLOSED = 'CLOSED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
  REWORK_REQUIRED = 'REWORK_REQUIRED'
}

export enum AtlasDeploymentType {
  STANDARD = 'STANDARD',
  EMERGENCY = 'EMERGENCY',
  MAINTENANCE = 'MAINTENANCE',
  UPGRADE = 'UPGRADE',
  ROLLBACK = 'ROLLBACK'
}

export enum AtlasApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED'
}

export enum AtlasEvidenceStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum AtlasEvidenceType {
  DEPLOYMENT_PLAN = 'DEPLOYMENT_PLAN',
  COMPLIANCE_CERTIFICATE = 'COMPLIANCE_CERTIFICATE',
  TEST_RESULTS = 'TEST_RESULTS',
  SIGN_OFF = 'SIGN_OFF',
  CHECKLIST = 'CHECKLIST',
  PHOTO = 'PHOTO',
  OTHER = 'OTHER'
}

// ─── Deployment DTOs ─────────────────────────────────────────────────────────

/** Minimal deployment record returned from list endpoints */
export interface AtlasDeploymentDto {
  id: string;
  title: string;
  type: AtlasDeploymentType;
  currentState: AtlasLifecycleState;
  clientId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

/** Full deployment detail including related entities */
export interface AtlasDeploymentDetailDto extends AtlasDeploymentDto {
  transitionHistory: AtlasStateTransitionDto[];
  evidence: AtlasEvidenceDto[];
  approvals: AtlasApprovalDto[];
  exceptions: AtlasExceptionDto[];
}

// ─── State Transitions ───────────────────────────────────────────────────────

export interface AtlasStateTransitionDto {
  id: string;
  fromState: AtlasLifecycleState;
  toState: AtlasLifecycleState;
  initiatedBy: string;
  timestamp: string;
  reason: string;
  result: string;
}

export interface AtlasTransitionRequest {
  targetState: AtlasLifecycleState;
  reason: string;
}

export interface AtlasTransitionResponse {
  deploymentId: string;
  previousState: AtlasLifecycleState;
  newState: AtlasLifecycleState;
  transitionedAt: string;
  reason: string;
}

// ─── Evidence ────────────────────────────────────────────────────────────────

export interface AtlasEvidenceDto {
  id: string;
  type: AtlasEvidenceType;
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  status: AtlasEvidenceStatus;
}

export interface AtlasEvidenceSubmissionRequest {
  type: AtlasEvidenceType;
  title: string;
  description: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// ─── Approvals ───────────────────────────────────────────────────────────────

export interface AtlasApprovalDto {
  id: string;
  deploymentId: string;
  forState: AtlasLifecycleState;
  status: AtlasApprovalStatus;
  approverId?: string;
  approvedAt?: string;
  comments?: string;
}

export interface AtlasApprovalRequestDto {
  deploymentId: string;
  forState: AtlasLifecycleState;
  justification?: string;
  context?: Record<string, unknown>;
}

export interface AtlasApprovalDecisionDto {
  decision: AtlasApprovalStatus;
  comments?: string;
  approverRole?: string;
  approverAuthority?: string;
  conditions?: Record<string, unknown>;
}

export interface AtlasApprovalAuthority {
  hasAuthority: boolean;
  reason?: string;
  requiredRole?: string;
}

export interface AtlasCriticalGateDefinition {
  state: AtlasLifecycleState;
  requiredApprovals: number;
  requiredRoles: string[];
  description: string;
}

// ─── Exceptions ──────────────────────────────────────────────────────────────

export interface AtlasExceptionDto {
  id: string;
  exceptionType: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt?: string;
  justification: string;
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

export interface AtlasAuditEventDto {
  id: string;
  timestamp: string;
  eventType: string;
  actorId: string;
  actorType: string;
  eventData: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

// ─── Create / Update Requests ────────────────────────────────────────────────

export interface AtlasCreateDeploymentRequest {
  title: string;
  type: AtlasDeploymentType;
  metadata?: Record<string, unknown>;
}

export interface AtlasUpdateDeploymentRequest {
  title?: string;
  type?: AtlasDeploymentType;
  metadata?: Record<string, unknown>;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface AtlasPaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  nextLink?: string;
  previousLink?: string;
}

export interface AtlasPagedResult<T> {
  items: T[];
  pagination: AtlasPaginationMetadata;
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export interface AtlasReadinessAssessment {
  status: 'READY' | 'NOT_READY' | 'NEEDS_REVIEW';
  score: number;
  summary: string;
  blockers: string[];
  warnings: string[];
}

export interface AtlasAnalysisResult {
  deploymentId: string;
  analyzedAt: string;
  readinessAssessment: AtlasReadinessAssessment;
  recommendations: AtlasRecommendation[];
  risks: AtlasRisk[];
}

export interface AtlasRisk {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigationStrategy?: string;
}

export interface AtlasRecommendation {
  id: string;
  action: string;
  reasoning: string;
  expectedImpact: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AtlasRiskAssessment {
  deploymentId: string;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risks: AtlasRisk[];
  assessedAt: string;
}

export interface AtlasRecommendationSet {
  deploymentId: string;
  recommendations: AtlasRecommendation[];
  generatedAt: string;
}

export interface AtlasAgentInfo {
  agentId: string;
  agentName: string;
  version: string;
  capabilities: string[];
}

// ─── Query Builder ────────────────────────────────────────────────────────────

export interface AtlasDataSourceInfo {
  id: string;
  name: string;
  description: string;
  fieldCount: number;
  maxRowsTotal: number;
}

export interface AtlasFieldConfig {
  name: string;
  displayName: string;
  dataType: string;
  operators: string[];
  isFilterable: boolean;
  isSortable: boolean;
  isGroupable: boolean;
}

export type AtlasFilterOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'greater_than_or_equal'
  | 'less_than' | 'less_than_or_equal'
  | 'is_null' | 'is_not_null'
  | 'in' | 'not_in'
  | 'between';

export interface AtlasFilterSelection {
  field: string;
  operator: AtlasFilterOperator;
  value: unknown;
  dataType: string;
}

export interface AtlasSortCriteria {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface AtlasUserQuery {
  dataSource: string;
  filters: AtlasFilterSelection[];
  logicalOperator?: 'AND' | 'OR';
  sortBy?: AtlasSortCriteria[];
  limit?: number;
}

export interface AtlasQueryResult {
  rows: Record<string, unknown>[];
  totalRows: number;
  columnMetadata: Record<string, string>;
  executionTimeMs: number;
}

export type AtlasExportFormat = 'CSV' | 'JSON' | 'EXCEL';

export interface AtlasExportRequest {
  queryResult: AtlasQueryResult;
  format: AtlasExportFormat;
  dataSource: string;
  fileName?: string;
}

export interface AtlasQueryTemplate {
  id: string;
  name: string;
  description?: string;
  query: AtlasUserQuery;
  createdBy: string;
  createdAt: string;
}

// ─── Sign-Off (SRI-specific, stored in Atlas metadata) ───────────────────────

export interface AtlasSignOffRequest {
  signOffType: 'VENDOR' | 'DE' | 'TECH';
  userId: string;
  notes?: string;
}

export interface AtlasSignOffStatus {
  deploymentId: string;
  vendorSigned: boolean;
  vendorSignedBy?: string;
  vendorSignedAt?: string;
  deSigned: boolean;
  deSignedBy?: string;
  deSignedAt?: string;
  techSigned: boolean;
  techSignedBy?: string;
  techSignedAt?: string;
  isFullySignedOff: boolean;
  pendingSignOffs: string[];
  completedSignOffs: string[];
}

// ─── State Mapping Utilities ─────────────────────────────────────────────────

import { DeploymentStatus } from '../features/deployment/models/deployment.models';

/**
 * Maps Atlas LifecycleState to SRI DeploymentStatus.
 * Used when displaying Atlas deployments in the existing SRI UI.
 */
export function atlasStateToSriStatus(state: AtlasLifecycleState): DeploymentStatus {
  switch (state) {
    case AtlasLifecycleState.DRAFT:
    case AtlasLifecycleState.SUBMITTED:
    case AtlasLifecycleState.INTAKE_REVIEW:
      return DeploymentStatus.Planned;
    case AtlasLifecycleState.PLANNING:
      return DeploymentStatus.Survey;
    case AtlasLifecycleState.READY:
    case AtlasLifecycleState.IN_PROGRESS:
      return DeploymentStatus.Install;
    case AtlasLifecycleState.EXECUTION_COMPLETE:
    case AtlasLifecycleState.QA_REVIEW:
      return DeploymentStatus.Labeling;
    case AtlasLifecycleState.APPROVED_FOR_CLOSEOUT:
      return DeploymentStatus.Handoff;
    case AtlasLifecycleState.CLOSED:
      return DeploymentStatus.Complete;
    default:
      return DeploymentStatus.Planned;
  }
}

/**
 * Maps SRI DeploymentStatus to Atlas LifecycleState.
 * Used when creating Atlas deployments from SRI workflows.
 */
export function sriStatusToAtlasState(status: DeploymentStatus): AtlasLifecycleState {
  switch (status) {
    case DeploymentStatus.Planned:
      return AtlasLifecycleState.DRAFT;
    case DeploymentStatus.Survey:
      return AtlasLifecycleState.PLANNING;
    case DeploymentStatus.Inventory:
      return AtlasLifecycleState.PLANNING;
    case DeploymentStatus.Install:
      return AtlasLifecycleState.IN_PROGRESS;
    case DeploymentStatus.Cabling:
    case DeploymentStatus.Labeling:
      return AtlasLifecycleState.EXECUTION_COMPLETE;
    case DeploymentStatus.Handoff:
      return AtlasLifecycleState.APPROVED_FOR_CLOSEOUT;
    case DeploymentStatus.Complete:
      return AtlasLifecycleState.CLOSED;
    default:
      return AtlasLifecycleState.DRAFT;
  }
}

/** Human-readable label for a lifecycle state */
export function atlasStateLabel(state: AtlasLifecycleState): string {
  const labels: Record<AtlasLifecycleState, string> = {
    [AtlasLifecycleState.DRAFT]: 'Draft',
    [AtlasLifecycleState.SUBMITTED]: 'Submitted',
    [AtlasLifecycleState.INTAKE_REVIEW]: 'Intake Review',
    [AtlasLifecycleState.PLANNING]: 'Planning',
    [AtlasLifecycleState.READY]: 'Ready',
    [AtlasLifecycleState.IN_PROGRESS]: 'In Progress',
    [AtlasLifecycleState.EXECUTION_COMPLETE]: 'Execution Complete',
    [AtlasLifecycleState.QA_REVIEW]: 'QA Review',
    [AtlasLifecycleState.APPROVED_FOR_CLOSEOUT]: 'Approved for Closeout',
    [AtlasLifecycleState.CLOSED]: 'Closed',
    [AtlasLifecycleState.ON_HOLD]: 'On Hold',
    [AtlasLifecycleState.CANCELLED]: 'Cancelled',
    [AtlasLifecycleState.REWORK_REQUIRED]: 'Rework Required'
  };
  return labels[state] ?? state;
}

/** Returns true if a state is a terminal (non-actionable) state */
export function isAtlasTerminalState(state: AtlasLifecycleState): boolean {
  return state === AtlasLifecycleState.CLOSED || state === AtlasLifecycleState.CANCELLED;
}

/** Returns true if a state is a critical governance gate requiring human approval */
export function isAtlasCriticalGate(state: AtlasLifecycleState): boolean {
  return state === AtlasLifecycleState.READY || state === AtlasLifecycleState.APPROVED_FOR_CLOSEOUT;
}
