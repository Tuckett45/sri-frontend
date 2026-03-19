/**
 * Shared Selector Helper Functions
 * 
 * Common utility functions used across multiple selector files
 * to avoid code duplication and improve maintainability.
 */

import { DataScope } from '../../services/data-scope.service';
import { User } from '../../../../models/user.model';

/**
 * Determine the scope type from data scopes array
 * 
 * Used by scope-filtered selectors to determine which filtering logic to apply
 * based on the user's role and permissions.
 * 
 * Priority order: all > market > company > self
 * 
 * @param dataScopes - Array of data scope definitions
 * @returns The primary scope type to apply
 */
export function determineScopeType(dataScopes: DataScope[]): 'all' | 'market' | 'company' | 'self' {
  if (!dataScopes || dataScopes.length === 0) {
    return 'self'; // Default to most restrictive
  }

  // Priority order: all > market > company > self
  for (const scope of dataScopes) {
    if (scope.scopeType === 'all') {
      return 'all';
    }
  }

  for (const scope of dataScopes) {
    if (scope.scopeType === 'market') {
      return 'market';
    }
  }

  for (const scope of dataScopes) {
    if (scope.scopeType === 'company') {
      return 'company';
    }
  }

  return 'self';
}

/**
 * Filter jobs array by scope
 * 
 * Helper function to filter jobs based on user scope.
 * Used by reporting selectors to filter nested job data.
 * 
 * @param jobs - Array of jobs to filter
 * @param user - Current user with role, market, company
 * @param scopeType - Scope type to apply
 * @returns Filtered jobs array
 */
export function filterJobsByScope<T extends { market?: string; company?: string }>(
  jobs: T[],
  user: User,
  scopeType: 'all' | 'market' | 'company' | 'self'
): T[] {
  switch (scopeType) {
    case 'all':
      return jobs;

    case 'market':
      if (user.market === 'RG') {
        return jobs;
      }
      return jobs.filter(job => job.market === user.market);

    case 'company':
      return jobs.filter(job =>
        job.company === user.company && job.market === user.market
      );

    case 'self':
      // Technicians don't have access to reporting features per requirements
      // Return empty array
      return [];

    default:
      return [];
  }
}

/**
 * Calculate distance between two geographic points using Haversine formula
 * 
 * Used by assignment conflict detection to check if technician is too far from job site.
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 * 
 * Helper function for distance calculations.
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if two time ranges overlap
 * 
 * Used by assignment conflict detection to identify scheduling conflicts.
 * 
 * @param start1 - Start of first time range
 * @param end1 - End of first time range
 * @param start2 - Start of second time range
 * @param end2 - End of second time range
 * @returns True if time ranges overlap
 */
export function timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  
  // Ranges overlap if: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1;
}
