/**
 * Atlas Platform Lifecycle API Endpoints
 *
 * Endpoints for the SRI Project Lifecycle API (sri-project-lifecycle-api)
 * and the Atlas Core API (atlas-api) that were previously unconsumed.
 *
 * These enable:
 * - Project lifecycle management (phase transitions, checklists, audit trails)
 * - Project-level financial management (cost analysis, budget baselines, overruns)
 * - Performance metrics (SPI, CPI, bottleneck detection)
 * - Integration hub (Spectrum, procurement, travel, accounting)
 * - Labor summaries from Atlas Core
 */

import { environment } from '../../../../environments/environments';

/**
 * SRI Project Lifecycle API base URL
 * This is a separate APIM resource from the Atlas Core API.
 * If your APIM requires a different subscription key for this resource,
 * configure it in the AtlasAuthInterceptor or add a dedicated interceptor.
 */
export const LIFECYCLE_API_BASE = environment.lifecycleApiUrl;

/**
 * Atlas Core API base URL (v1 versioned endpoints)
 */
export const ATLAS_CORE_API_BASE = environment.atlasApiUrl;

// ─── Project Lifecycle Endpoints ────────────────────────────────────────────────

export const PROJECT_LIFECYCLE_ENDPOINTS = {
  /** GET /api/Projects - List all projects with optional filtering */
  getProjects: () => `${LIFECYCLE_API_BASE}/Projects`,

  /** GET /api/Projects/:projectId - Get project detail */
  getProject: (projectId: string) => `${LIFECYCLE_API_BASE}/Projects/${projectId}`,

  /** POST /api/Projects - Create a new project from RFP */
  createProject: () => `${LIFECYCLE_API_BASE}/Projects`,

  /** POST /api/Projects/:projectId/transition - Request phase transition */
  requestTransition: (projectId: string) => `${LIFECYCLE_API_BASE}/Projects/${projectId}/transition`,

  /** GET /api/Projects/:projectId/checklist - Get phase activity checklist */
  getChecklist: (projectId: string) => `${LIFECYCLE_API_BASE}/Projects/${projectId}/checklist`,

  /** GET /api/Projects/:projectId/audit - Get project audit trail */
  getAuditTrail: (projectId: string) => `${LIFECYCLE_API_BASE}/Projects/${projectId}/audit`,
} as const;

// ─── Activity Endpoints ─────────────────────────────────────────────────────────

export const ACTIVITY_ENDPOINTS = {
  /** POST /api/projects/:projectId/Activities/:activityId/complete - Complete activity with evidence */
  completeActivity: (projectId: string, activityId: string) =>
    `${LIFECYCLE_API_BASE}/projects/${projectId}/Activities/${activityId}/complete`,

  /** POST /api/projects/:projectId/Activities/progress - Track daily execution progress */
  trackProgress: (projectId: string) =>
    `${LIFECYCLE_API_BASE}/projects/${projectId}/Activities/progress`,

  /** GET /api/projects/:projectId/Activities/progress - Get execution progress */
  getProgress: (projectId: string) =>
    `${LIFECYCLE_API_BASE}/projects/${projectId}/Activities/progress`,
} as const;

// ─── Reports & Analytics Endpoints ──────────────────────────────────────────────

export const LIFECYCLE_REPORTS_ENDPOINTS = {
  /** GET /api/Reports/project-status - Project status report with phase/status filters */
  getProjectStatusReport: () => `${LIFECYCLE_API_BASE}/Reports/project-status`,

  /** GET /api/Reports/performance/:projectId - SPI, CPI, on-time delivery, bottlenecks */
  getPerformanceMetrics: (projectId: string) =>
    `${LIFECYCLE_API_BASE}/Reports/performance/${projectId}`,

  /** GET /api/Reports/resource-utilization - Resource utilization by date range */
  getResourceUtilization: () => `${LIFECYCLE_API_BASE}/Reports/resource-utilization`,

  /** GET /api/Reports/cost-analysis/:projectId - Detailed cost analysis for a project */
  getCostAnalysis: (projectId: string) =>
    `${LIFECYCLE_API_BASE}/Reports/cost-analysis/${projectId}`,

  /** GET /api/Reports/historical-analysis - Historical benchmarking data */
  getHistoricalAnalysis: () => `${LIFECYCLE_API_BASE}/Reports/historical-analysis`,

  /** GET /api/Reports/export/:projectId - Export project data (json, csv, excel) */
  exportProjectData: (projectId: string) =>
    `${LIFECYCLE_API_BASE}/Reports/export/${projectId}`,
} as const;

// ─── Integration Hub Endpoints ──────────────────────────────────────────────────

export const INTEGRATION_HUB_ENDPOINTS = {
  /** POST /api/Integrations/spectrum/jobs - Create a Spectrum job for a project */
  createSpectrumJob: () => `${LIFECYCLE_API_BASE}/Integrations/spectrum/jobs`,

  /** POST /api/Integrations/procurement/orders - Submit procurement order */
  submitProcurementOrder: () => `${LIFECYCLE_API_BASE}/Integrations/procurement/orders`,

  /** POST /api/Integrations/travel/bookings - Book travel for a project */
  bookTravel: () => `${LIFECYCLE_API_BASE}/Integrations/travel/bookings`,

  /** POST /api/Integrations/accounting/invoices - Process an invoice */
  processInvoice: () => `${LIFECYCLE_API_BASE}/Integrations/accounting/invoices`,

  /** GET /api/Integrations/health - Integration health status */
  getIntegrationHealth: () => `${LIFECYCLE_API_BASE}/Integrations/health`,
} as const;

// ─── Atlas Core Labor Endpoints ─────────────────────────────────────────────────

export const ATLAS_LABOR_ENDPOINTS = {
  /** GET /v1/time-entries/labor-summary/:jobId - Get labor summary for a job */
  getLaborSummary: (jobId: string) => `${ATLAS_CORE_API_BASE}/time-entries/labor-summary/${jobId}`,

  /** GET /v1/time-entries - Get time entries with filters */
  getTimeEntries: () => `${ATLAS_CORE_API_BASE}/time-entries`,
} as const;
