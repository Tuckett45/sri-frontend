/**
 * Assignment State Interface
 * Defines the shape of the assignment state slice in the NgRx store
 */

import { EntityState } from '@ngrx/entity';
import { Assignment, Conflict, TechnicianMatch } from '../../models/assignment.model';

export interface AssignmentState extends EntityState<Assignment> {
  conflicts: Conflict[];
  qualifiedTechnicians: TechnicianMatch[];
  loading: boolean;
  error: string | null;
}
