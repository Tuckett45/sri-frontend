/**
 * Barrel export for Field Resource Management models
 */

// Core models
export * from './technician.model';
export * from './job.model';
export * from './assignment.model';
export * from './crew.model';
export * from './time-entry.model';
export * from './reporting.model';
export * from './notification.model';

// Job Budget and Tracking Enhancement models
export * from './budget.model';
// Re-export timecard.model excluding TimecardStatus (already exported from time-entry.model)
export { RoundingMethod } from './timecard.model';
export type { TimecardEntry, RoundingConfig } from './timecard.model';
// Re-export travel.model excluding Address (already exported from job.model)
export { GeocodingStatus, TransportationMode } from './travel.model';
export type { Coordinates, TravelPreferences, TravelHistoryEntry, TravelProfile, TechnicianDistance, PerDiemConfig } from './travel.model';
export { Address as TravelAddress } from './travel.model';
export * from './inventory.model';
// Re-export material.model excluding DTO interfaces (already exported from dtos/material.dto)
export { MaterialCategory, TransactionType, PurchaseOrderStatus, ReorderUrgency } from './material.model';
export type { Material, MaterialTransaction, Supplier, PurchaseOrder, PurchaseOrderItem, ReorderRecommendation } from './material.model';

// Payroll models
export * from './payroll.models';

// Dashboard models
export * from './dashboard.models';

// Job Setup models
export * from './job-setup.models';

// Deployment Checklist models
export * from './deployment-checklist.model';

// Quote/RFP Workflow models
export * from './quote-workflow.model';

// PTO models
export * from './pto.models';

// DTOs
export * from './dtos/technician.dto';
export * from './dtos/job.dto';
export * from './dtos/assignment.dto';
export * from './dtos/time-entry.dto';
export * from './dtos/filters.dto';

// Job Budget and Tracking Enhancement DTOs
export * from './dtos/budget.dto';
export * from './dtos/travel.dto';
export * from './dtos/inventory.dto';
export * from './dtos/material.dto';
