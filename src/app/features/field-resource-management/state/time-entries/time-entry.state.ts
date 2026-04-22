/**
 * Time Entry State Interface
 * Defines the shape of the time entry state slice in the NgRx store
 */

import { EntityState } from '@ngrx/entity';
import { TimeEntry } from '../../models/time-entry.model';

export interface TimeEntryState extends EntityState<TimeEntry> {
  activeEntry: TimeEntry | null;
  loading: boolean;
  error: string | null;
}
