/**
 * Technician State Interface
 * Defines the shape of the technician state slice in the NgRx store
 */

import { EntityState } from '@ngrx/entity';
import { Technician } from '../../models/technician.model';
import { TechnicianFilters } from '../../models/dtos/filters.dto';

export interface TechnicianState extends EntityState<Technician> {
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  filters: TechnicianFilters;
}
