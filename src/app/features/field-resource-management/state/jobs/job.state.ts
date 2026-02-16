/**
 * Job State Interface
 * Defines the shape of the job state slice in the NgRx store
 */

import { EntityState } from '@ngrx/entity';
import { Job } from '../../models/job.model';
import { JobFilters } from '../../models/dtos/filters.dto';

export interface JobState extends EntityState<Job> {
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  filters: JobFilters;
}
