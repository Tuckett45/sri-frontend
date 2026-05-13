import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  ApprovalCounts,
  PendingTimecard,
  PendingExpense,
  TravelBreakPtoSummary,
} from '../models/dashboard.models';

/**
 * Dashboard Data Service
 *
 * Provides data for the HR/Payroll dashboard widgets.
 * Currently returns mock data for demo purposes.
 * TODO: Replace with real HttpClient calls when API endpoints are available.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataService {

  getApprovalCounts(): Observable<ApprovalCounts> {
    return of({
      pendingTimecards: 12,
      pendingExpenses: 7,
      pendingTravelRequests: 4,
      pendingBreakRequests: 3
    }).pipe(delay(400));
  }

  getPendingTimecards(): Observable<PendingTimecard[]> {
    const now = new Date();
    const timecards: PendingTimecard[] = [
      {
        id: 'tc-001',
        technicianName: 'Marcus Rivera',
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 15),
        totalHours: 84.5,
        submittedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        status: 'Submitted'
      },
      {
        id: 'tc-002',
        technicianName: 'Sarah Chen',
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 15),
        totalHours: 92.0,
        submittedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        status: 'Submitted'
      },
      {
        id: 'tc-003',
        technicianName: 'James Okafor',
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 15),
        totalHours: 78.25,
        submittedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        status: 'Submitted'
      },
      {
        id: 'tc-004',
        technicianName: 'Emily Tran',
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 15),
        totalHours: 88.0,
        submittedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        status: 'Submitted'
      },
      {
        id: 'tc-005',
        technicianName: 'David Park',
        periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 16),
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 0),
        totalHours: 96.75,
        submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: 'Submitted'
      }
    ];
    return of(timecards).pipe(delay(500));
  }

  getPendingExpenses(): Observable<PendingExpense[]> {
    const now = new Date();
    const expenses: PendingExpense[] = [
      {
        id: 'exp-001',
        submittedBy: 'Marcus Rivera',
        amount: 245.80,
        type: 'Fuel',
        submittedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        description: 'Fuel for job site travel — Dallas to Fort Worth round trip'
      },
      {
        id: 'exp-002',
        submittedBy: 'Sarah Chen',
        amount: 127.50,
        type: 'Tools',
        submittedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        description: 'Replacement cable tester for field kit'
      },
      {
        id: 'exp-003',
        submittedBy: 'James Okafor',
        amount: 89.99,
        type: 'Meals',
        submittedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        description: 'Team lunch during extended on-site shift'
      },
      {
        id: 'exp-004',
        submittedBy: 'Emily Tran',
        amount: 412.00,
        type: 'Lodging',
        submittedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
        description: 'Hotel stay for 2-day remote site deployment'
      },
      {
        id: 'exp-005',
        submittedBy: 'David Park',
        amount: 67.25,
        type: 'Fuel',
        submittedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        description: 'Fuel for emergency site visit'
      }
    ];
    return of(expenses).pipe(delay(450));
  }

  getTravelBreakPtoSummary(): Observable<TravelBreakPtoSummary> {
    return of({
      pendingTravelRequests: 4,
      pendingBreakRequests: 3,
      pendingPtoRequests: 6
    }).pipe(delay(350));
  }
}
