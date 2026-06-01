import { DashboardFilters, DashboardQuote, DashboardUser } from '../../models/quote-workflow.model';

export interface DashboardState {
  rfpRecords: DashboardQuote[];
  poTrackingRecords: DashboardQuote[];
  projectTrackingRecords: DashboardQuote[];
  users: DashboardUser[];
  filters: DashboardFilters;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export const initialDashboardState: DashboardState = {
  rfpRecords: [],
  poTrackingRecords: [],
  projectTrackingRecords: [],
  users: [],
  filters: {
    customer: '',
    dateFrom: null,
    dateTo: null,
    assignedTo: '',
    phase: ''
  },
  loading: false,
  saving: false,
  error: null
};
