/**
 * Budget DTOs (Data Transfer Objects)
 * Request/response objects for budget API operations
 */

/**
 * Create budget DTO
 */
export interface CreateBudgetDto {
  jobId: string;
  allocatedHours: number;
}

/**
 * Adjust budget DTO
 */
export interface AdjustBudgetDto {
  amount: number;
  reason: string;
}

/**
 * Deduct hours DTO
 */
export interface DeductHoursDto {
  hours: number;
  timecardEntryId: string;
}
