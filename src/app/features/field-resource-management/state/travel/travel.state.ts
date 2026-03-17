/**
 * Travel State Interface
 * Defines the shape of the travel state in the NgRx store
 */

import { EntityState } from '@ngrx/entity';
import { TravelProfile, TechnicianDistance, PerDiemConfig } from '../../models/travel.model';

/**
 * Travel state interface
 */
export interface TravelState {
  // Normalized travel profiles using EntityAdapter
  profiles: EntityState<TravelProfile>;
  
  // Distance calculations grouped by job ID
  distances: { [jobId: string]: TechnicianDistance[] };
  
  // Per diem configuration
  perDiemConfig: PerDiemConfig;
  
  // Loading state
  loading: boolean;
  
  // Error state
  error: string | null;
  
  // Technicians currently being geocoded
  geocodingInProgress: Set<string>;
  
  // Selected technician ID for detail view
  selectedTechnicianId: string | null;
}
