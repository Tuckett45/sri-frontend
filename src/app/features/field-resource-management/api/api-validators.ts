/**
 * API Request/Response Validators
 * 
 * Provides validation functions for API request DTOs and response data.
 * Ensures data integrity before sending requests and after receiving responses.
 * 
 * Requirements: All API-related requirements
 */

import { CreateBudgetDto, AdjustBudgetDto, DeductHoursDto } from '../models/dtos/budget.dto';
import { UpdateTravelProfileDto } from '../models/dtos/travel.dto';
import { CreateInventoryItemDto, AssignInventoryDto } from '../models/dtos/inventory.dto';
import { CreateMaterialDto, ConsumeMaterialDto, CreatePurchaseOrderDto } from '../models/dtos/material.dto';
import { Address } from '../models/travel.model';
import { LocationType, InventoryCategory } from '../models/inventory.model';
import { MaterialCategory } from '../models/material.model';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Create a successful validation result
 */
function valid(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Create a failed validation result
 */
function invalid(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

// ============================================================================
// Budget Validators
// ============================================================================

/**
 * Validate CreateBudgetDto
 * Requirements: 1.1, 1.2
 */
export function validateCreateBudget(dto: CreateBudgetDto): ValidationResult {
  const errors: string[] = [];

  if (!dto.jobId || typeof dto.jobId !== 'string' || dto.jobId.trim().length === 0) {
    errors.push('jobId is required and must be a non-empty string');
  }
  if (dto.allocatedHours == null || typeof dto.allocatedHours !== 'number') {
    errors.push('allocatedHours is required and must be a number');
  } else if (dto.allocatedHours <= 0) {
    errors.push('allocatedHours must be greater than 0');
  } else if (dto.allocatedHours > 10000) {
    errors.push('allocatedHours must not exceed 10000');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

/**
 * Validate AdjustBudgetDto
 * Requirements: 2.1-2.6
 */
export function validateAdjustBudget(dto: AdjustBudgetDto): ValidationResult {
  const errors: string[] = [];

  if (dto.amount == null || typeof dto.amount !== 'number') {
    errors.push('amount is required and must be a number');
  } else if (dto.amount === 0) {
    errors.push('amount must not be zero');
  } else if (Math.abs(dto.amount) > 1000) {
    errors.push('amount must be between -1000 and 1000');
  }
  if (!dto.reason || typeof dto.reason !== 'string' || dto.reason.trim().length < 10) {
    errors.push('reason is required and must be at least 10 characters');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

/**
 * Validate DeductHoursDto
 * Requirements: 1.2, 1.3, 3.6
 */
export function validateDeductHours(dto: DeductHoursDto): ValidationResult {
  const errors: string[] = [];

  if (dto.hours == null || typeof dto.hours !== 'number') {
    errors.push('hours is required and must be a number');
  } else if (dto.hours <= 0) {
    errors.push('hours must be greater than 0');
  } else if (dto.hours > 24) {
    errors.push('hours must not exceed 24');
  }
  if (!dto.timecardEntryId || typeof dto.timecardEntryId !== 'string' || dto.timecardEntryId.trim().length === 0) {
    errors.push('timecardEntryId is required and must be a non-empty string');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

// ============================================================================
// Travel Validators
// ============================================================================

/**
 * Validate Address
 * Requirements: 5.2
 */
export function validateAddress(address: Address): ValidationResult {
  const errors: string[] = [];

  if (!address.street || address.street.trim().length === 0) {
    errors.push('street is required');
  }
  if (!address.city || address.city.trim().length === 0) {
    errors.push('city is required');
  }
  if (!address.state || !/^[A-Z]{2}$/.test(address.state)) {
    errors.push('state must be a 2-letter uppercase code (e.g., CA)');
  }
  if (!address.postalCode || !/^\d{5}(-\d{4})?$/.test(address.postalCode)) {
    errors.push('postalCode must be a valid US postal code (e.g., 12345 or 12345-6789)');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

/**
 * Validate UpdateTravelProfileDto
 * Requirements: 4.2, 5.2
 */
export function validateUpdateTravelProfile(dto: UpdateTravelProfileDto): ValidationResult {
  const errors: string[] = [];

  if (dto.willingToTravel !== undefined && typeof dto.willingToTravel !== 'boolean') {
    errors.push('willingToTravel must be a boolean');
  }
  if (dto.homeAddress) {
    const addressResult = validateAddress(dto.homeAddress);
    if (!addressResult.valid) {
      errors.push(...addressResult.errors);
    }
  }
  if (dto.willingToTravel === undefined && !dto.homeAddress) {
    errors.push('At least one field (willingToTravel or homeAddress) must be provided');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

// ============================================================================
// Inventory Validators
// ============================================================================

/**
 * Validate CreateInventoryItemDto
 * Requirements: 6.1-6.4
 */
export function validateCreateInventoryItem(dto: CreateInventoryItemDto): ValidationResult {
  const errors: string[] = [];

  if (!dto.itemNumber || dto.itemNumber.trim().length === 0) {
    errors.push('itemNumber is required');
  }
  if (!dto.name || dto.name.trim().length === 0) {
    errors.push('name is required');
  }
  if (!dto.description || dto.description.trim().length === 0) {
    errors.push('description is required');
  }
  if (!dto.category || !Object.values(InventoryCategory).includes(dto.category)) {
    errors.push('category must be a valid InventoryCategory');
  }
  if (dto.quantity == null || dto.quantity < 0) {
    errors.push('quantity must be a non-negative number');
  }
  if (dto.unitCost == null || dto.unitCost < 0) {
    errors.push('unitCost must be a non-negative number');
  }
  if (dto.minimumThreshold == null || dto.minimumThreshold < 0) {
    errors.push('minimumThreshold must be a non-negative number');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

/**
 * Validate AssignInventoryDto
 * Requirements: 6.5-6.7, 10.2
 */
export function validateAssignInventory(dto: AssignInventoryDto): ValidationResult {
  const errors: string[] = [];

  if (!dto.locationType || !Object.values(LocationType).includes(dto.locationType)) {
    errors.push('locationType must be a valid LocationType');
  }
  if (!dto.locationId || dto.locationId.trim().length === 0) {
    errors.push('locationId is required');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

// ============================================================================
// Materials Validators
// ============================================================================

/**
 * Validate CreateMaterialDto
 * Requirements: 7.1-7.5
 */
export function validateCreateMaterial(dto: CreateMaterialDto): ValidationResult {
  const errors: string[] = [];

  if (!dto.materialNumber || dto.materialNumber.trim().length === 0) {
    errors.push('materialNumber is required');
  }
  if (!dto.name || dto.name.trim().length === 0) {
    errors.push('name is required');
  }
  if (!dto.description || dto.description.trim().length === 0) {
    errors.push('description is required');
  }
  if (!dto.category || !Object.values(MaterialCategory).includes(dto.category)) {
    errors.push('category must be a valid MaterialCategory');
  }
  if (!dto.unit || dto.unit.trim().length === 0) {
    errors.push('unit is required');
  }
  if (dto.currentQuantity == null || dto.currentQuantity < 0) {
    errors.push('currentQuantity must be a non-negative number');
  }
  if (dto.reorderPoint == null || dto.reorderPoint < 0) {
    errors.push('reorderPoint must be a non-negative number');
  }
  if (dto.reorderQuantity == null || dto.reorderQuantity <= 0) {
    errors.push('reorderQuantity must be greater than 0');
  }
  if (dto.unitCost == null || dto.unitCost < 0) {
    errors.push('unitCost must be a non-negative number');
  }
  if (!dto.preferredSupplierId || dto.preferredSupplierId.trim().length === 0) {
    errors.push('preferredSupplierId is required');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

/**
 * Validate ConsumeMaterialDto
 * Requirements: 7.9, 11.1
 */
export function validateConsumeMaterial(dto: ConsumeMaterialDto): ValidationResult {
  const errors: string[] = [];

  if (!dto.materialId || dto.materialId.trim().length === 0) {
    errors.push('materialId is required');
  }
  if (!dto.jobId || dto.jobId.trim().length === 0) {
    errors.push('jobId is required');
  }
  if (dto.quantity == null || dto.quantity <= 0) {
    errors.push('quantity must be greater than 0');
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

/**
 * Validate CreatePurchaseOrderDto
 * Requirements: 7.6, 7.7
 */
export function validateCreatePurchaseOrder(dto: CreatePurchaseOrderDto): ValidationResult {
  const errors: string[] = [];

  if (!dto.supplierId || dto.supplierId.trim().length === 0) {
    errors.push('supplierId is required');
  }
  if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    dto.items.forEach((item, index) => {
      if (!item.materialId || item.materialId.trim().length === 0) {
        errors.push(`items[${index}].materialId is required`);
      }
      if (item.quantity == null || item.quantity <= 0) {
        errors.push(`items[${index}].quantity must be greater than 0`);
      }
      if (item.unitCost == null || item.unitCost < 0) {
        errors.push(`items[${index}].unitCost must be a non-negative number`);
      }
    });
  }

  return errors.length > 0 ? invalid(...errors) : valid();
}

// ============================================================================
// Generic Validators
// ============================================================================

/**
 * Validate that a string ID is non-empty
 */
export function validateId(id: string, fieldName: string = 'id'): ValidationResult {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return invalid(`${fieldName} is required and must be a non-empty string`);
  }
  return valid();
}
