/**
 * API Integration Layer
 * 
 * Barrel export for all API services, endpoints, and validators.
 * Provides a centralized, validated API integration layer for the
 * Field Resource Management module.
 */

// Endpoint definitions
export * from './api-endpoints';

// Request/response validators
export * from './api-validators';

// API services
export * from './budget-api.service';
export * from './travel-api.service';
export * from './inventory-api.service';
export * from './materials-api.service';
export * from './reporting-api.service';
