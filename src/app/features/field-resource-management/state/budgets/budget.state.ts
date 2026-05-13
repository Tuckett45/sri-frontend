/**
 * Budget State
 * Defines the state structure for budget management
 */

import { EntityState } from '@ngrx/entity';
import { JobBudget, BudgetAdjustment, BudgetDeduction } from '../../models/budget.model';

/**
 * Budget state interface with EntityAdapter
 */
export interface BudgetState extends EntityState<JobBudget> {
  selectedJobId: string | null;
  loading: boolean;
  error: string | null;
  adjustmentHistory: Record<string, BudgetAdjustment[]>;
  deductionHistory: Record<string, BudgetDeduction[]>;
  alertThresholds: {
    warning: number;  // Default: 80%
    critical: number; // Default: 100%
  };
}
