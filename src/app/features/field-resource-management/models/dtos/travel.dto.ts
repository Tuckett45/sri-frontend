/**
 * Travel DTOs (Data Transfer Objects)
 * 
 * DTOs for travel-related API requests
 */

import { Address } from '../travel.model';

/**
 * Update travel profile DTO
 */
export interface UpdateTravelProfileDto {
  willingToTravel?: boolean;
  homeAddress?: Address;
}
