/**
 * Crew State Interface
 * Defines the shape of the crew state slice in the NgRx store
 */

import { EntityState } from '@ngrx/entity';
import { Crew } from '../../models/crew.model';
import { CrewFilters } from '../../models/dtos/filters.dto';
import { LocationHistoryEntry } from '../../models/location-history.model';

export interface CrewState extends EntityState<Crew> {
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  filters: CrewFilters;
  locationHistory: {
    [crewId: string]: LocationHistoryEntry[];
  };
  locationHistoryLoading: boolean;
  locationHistoryError: string | null;
}
