import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { 
  TimecardPeriod, 
  TimecardLockConfig, 
  TimeEntry, 
  Expense,
  DailyTimeSummary,
  WeeklyTimeSummary,
  TimecardStatus
} from '../models/time-entry.model';
import {
  CategoryHoursSummary,
  PayTypeHoursSummary,
  JobBillableSummary
} from '../../../models/time-payroll.model';
import {
  calculateHoursByCategory,
  calculateHoursByPayType,
  calculatePeriodBillablesByJob
} from '../utils/timecard-calculations';
import { Job } from '../models/job.model';

/**
 * Timecard Service
 * 
 * Handles timecard period management, locking logic, and calculations.
 * Provides business logic for time entry validation and expense tracking.
 */
@Injectable({
  providedIn: 'root'
})
export class TimecardService {
  
  // Default lock configuration
  private defaultLockConfig: TimecardLockConfig = {
    enabled: true,
    lockDay: 'Friday',
    lockTime: '17:00',
    gracePeriodHours: 0,
    allowManagerUnlock: true,
    requireUnlockReason: true,
    autoRelockAfterHours: 24
  };

  constructor() {}

  /**
   * Get default lock configuration
   */
  getDefaultLockConfig(): TimecardLockConfig {
    return { ...this.defaultLockConfig };
  }

  /**
   * Get lock configuration
   */
  getLockConfig(): Observable<TimecardLockConfig> {
    // In production, this would fetch from API
    return of(this.defaultLockConfig);
  }

  /**
   * Update lock configuration
   */
  updateLockConfig(config: TimecardLockConfig): Observable<TimecardLockConfig> {
    // In production, this would update via API
    this.defaultLockConfig = config;
    return of(config);
  }

  /**
   * Calculate when a period will lock
   */
  calculateLockTime(periodEnd: Date, config: TimecardLockConfig): Date {
    if (!config.enabled) {
      return new Date(8640000000000000); // Max date if locking disabled
    }

    const lockDate = new Date(periodEnd);
    
    // Find the next occurrence of lock day after period end
    const lockDayIndex = this.getDayIndex(config.lockDay);
    const periodEndDayIndex = lockDate.getDay();
    
    let daysToAdd = lockDayIndex - periodEndDayIndex;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    lockDate.setDate(lockDate.getDate() + daysToAdd);
    
    // Set lock time
    const [hours, minutes] = config.lockTime.split(':').map(Number);
    lockDate.setHours(hours, minutes, 0, 0);
    
    // Add grace period
    lockDate.setHours(lockDate.getHours() + config.gracePeriodHours);
    
    return lockDate;
  }

  /**
   * Check if a period is currently locked
   */
  isPeriodLocked(period: TimecardPeriod, config: TimecardLockConfig): boolean {
    if (!config.enabled) {
      return false;
    }

    if (period.isLocked) {
      return true;
    }

    const lockTime = this.calculateLockTime(period.endDate, config);
    return new Date() >= lockTime;
  }

  /**
   * Calculate time until lock
   */
  getTimeUntilLock(period: TimecardPeriod, config: TimecardLockConfig): number {
    const lockTime = this.calculateLockTime(period.endDate, config);
    const now = new Date();
    return Math.max(0, lockTime.getTime() - now.getTime());
  }

  /**
   * Format time until lock as human-readable string
   */
  formatTimeUntilLock(milliseconds: number): string {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Calculate regular and overtime hours, with breakdowns by TimeCategory and PayType.
   *
   * Returns the original regular/overtime/total split plus category and pay-type
   * summaries computed by the pure utility functions.
   *
   * Requirements: 1.7, 2.4
   */
  calculateHours(timeEntries: TimeEntry[]): {
    regular: number;
    overtime: number;
    total: number;
    categoryBreakdown: CategoryHoursSummary;
    payTypeBreakdown: PayTypeHoursSummary;
  } {
    const totalHours = timeEntries.reduce((sum, entry) => {
      return sum + this.calculateEntryHours(entry);
    }, 0);

    const regularHours = Math.min(totalHours, 40);
    const overtimeHours = Math.max(0, totalHours - 40);

    const categoryBreakdown = calculateHoursByCategory(timeEntries);
    const payTypeBreakdown = calculateHoursByPayType(timeEntries);

    return {
      regular: regularHours,
      overtime: overtimeHours,
      total: totalHours,
      categoryBreakdown,
      payTypeBreakdown
    };
  }

  /**
   * Calculate hours for a single time entry
   */
  calculateEntryHours(entry: TimeEntry): number {
    if (!entry.clockInTime) return 0;
    
    const clockIn = new Date(entry.clockInTime).getTime();
    const clockOut = entry.clockOutTime 
      ? new Date(entry.clockOutTime).getTime() 
      : Date.now();
    
    const diffMs = clockOut - clockIn;
    let hours = diffMs / (1000 * 60 * 60);

    // Subtract break time if present
    if (entry.breakMinutes) {
      hours -= entry.breakMinutes / 60;
    }

    return Math.max(0, hours);
  }

  /**
   * Calculate daily overtime (>8 hours)
   */
  calculateDailyOvertime(hours: number): number {
    return Math.max(0, hours - 8);
  }

  /**
   * Group time entries by date
   */
  groupEntriesByDate(entries: TimeEntry[]): Map<string, TimeEntry[]> {
    const grouped = new Map<string, TimeEntry[]>();
    
    entries.forEach(entry => {
      const date = new Date(entry.clockInTime).toDateString();
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(entry);
    });
    
    return grouped;
  }

  /**
   * Create daily summaries from time entries
   */
  createDailySummaries(
    entries: TimeEntry[], 
    expenses: Expense[],
    config: TimecardLockConfig
  ): DailyTimeSummary[] {
    const grouped = this.groupEntriesByDate(entries);
    const summaries: DailyTimeSummary[] = [];

    grouped.forEach((dayEntries, dateString) => {
      const date = new Date(dateString);
      const dayExpenses = expenses.filter(exp => 
        new Date(exp.date).toDateString() === dateString
      );

      const totalHours = dayEntries.reduce((sum, entry) => 
        sum + this.calculateEntryHours(entry), 0
      );
      const dailyOT = this.calculateDailyOvertime(totalHours);
      const regularHours = totalHours - dailyOT;

      const totalExpenses = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Check if this day is locked
      const isLocked = this.isDayLocked(date, config);

      summaries.push({
        date,
        totalHours,
        regularHours,
        overtimeHours: dailyOT,
        jobCount: dayEntries.length,
        totalExpenses,
        timeEntries: dayEntries,
        expenses: dayExpenses,
        isLocked
      });
    });

    return summaries.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Create weekly summary with category/pay-type subtotals and billable amounts.
   *
   * The optional `jobs` map enables billable amount calculation per job.
   * When omitted, billable fields default to zero / empty.
   *
   * Requirements: 1.7, 2.4, 5.5
   */
  createWeeklySummary(
    weekStart: Date,
    weekEnd: Date,
    entries: TimeEntry[],
    expenses: Expense[],
    config: TimecardLockConfig,
    jobs?: Map<string, Pick<Job, 'standardBillRate' | 'overtimeBillRate'>>
  ): WeeklyTimeSummary {
    const dailySummaries = this.createDailySummaries(entries, expenses, config);
    
    const totalHours = dailySummaries.reduce((sum, day) => sum + day.totalHours, 0);
    const regularHours = Math.min(totalHours, 40);
    const overtimeHours = Math.max(0, totalHours - 40);
    
    const totalMileage = entries.reduce((sum, entry) => sum + (entry.mileage || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate lock time
    const lockTime = this.calculateLockTime(weekEnd, config);
    const isLocked = new Date() >= lockTime;
    const locksIn = isLocked ? undefined : lockTime;

    // Category and pay-type breakdowns (Requirements 1.7, 2.4)
    const categoryBreakdown = calculateHoursByCategory(entries);
    const payTypeBreakdown = calculateHoursByPayType(entries);

    // Billable amounts by job (Requirement 5.5)
    const jobBillableSummaries: JobBillableSummary[] = jobs
      ? calculatePeriodBillablesByJob(entries, jobs)
      : [];
    const totalBillableAmount = jobBillableSummaries.reduce(
      (sum, s) => sum + s.totalAmount, 0
    );

    return {
      weekStart,
      weekEnd,
      totalHours,
      regularHours,
      overtimeHours,
      totalMileage,
      totalExpenses,
      dailySummaries,
      isLocked,
      locksIn,
      driveTimeHours: categoryBreakdown.driveTimeHours,
      onSiteHours: categoryBreakdown.onSiteHours,
      holidayHours: payTypeBreakdown.holidayHours,
      ptoHours: payTypeBreakdown.ptoHours,
      totalBillableAmount,
      jobBillableSummaries
    };
  }

  /**
   * Check if a specific day is locked
   */
  private isDayLocked(date: Date, config: TimecardLockConfig): boolean {
    if (!config.enabled) {
      return false;
    }

    // Create a mock period for this day to check lock status
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const lockTime = this.calculateLockTime(dayEnd, config);
    return new Date() >= lockTime;
  }

  /**
   * Get day index (0 = Sunday, 6 = Saturday)
   */
  private getDayIndex(day: string): number {
    const days: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };
    return days[day] || 5; // Default to Friday
  }

  /**
   * Get week start date (Monday)
   */
  getWeekStart(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust for Sunday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get week end date (Sunday)
   */
  getWeekEnd(date: Date = new Date()): Date {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  /**
   * Get biweekly period dates
   */
  getBiweeklyPeriod(date: Date = new Date()): { start: Date; end: Date } {
    const weekStart = this.getWeekStart(date);
    
    // Determine if this is week 1 or week 2 of the biweekly period
    const weekNumber = this.getWeekNumber(weekStart);
    const isEvenWeek = weekNumber % 2 === 0;
    
    let periodStart: Date;
    let periodEnd: Date;
    
    if (isEvenWeek) {
      // This is week 2, go back one week for period start
      periodStart = new Date(weekStart);
      periodStart.setDate(periodStart.getDate() - 7);
      periodEnd = this.getWeekEnd(weekStart);
    } else {
      // This is week 1, period starts this week
      periodStart = weekStart;
      periodEnd = new Date(weekStart);
      periodEnd.setDate(periodEnd.getDate() + 13);
      periodEnd.setHours(23, 59, 59, 999);
    }
    
    return { start: periodStart, end: periodEnd };
  }

  /**
   * Get week number of the year
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Validate time entry for overlaps
   */
  validateTimeEntry(entry: TimeEntry, existingEntries: TimeEntry[]): string[] {
    const errors: string[] = [];

    if (!entry.clockInTime) {
      errors.push('Clock in time is required');
      return errors;
    }

    const clockIn = new Date(entry.clockInTime).getTime();
    const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime).getTime() : Date.now();

    // Check for overlaps with existing entries
    existingEntries.forEach(existing => {
      if (existing.id === entry.id) return; // Skip self

      const existingIn = new Date(existing.clockInTime).getTime();
      const existingOut = existing.clockOutTime 
        ? new Date(existing.clockOutTime).getTime() 
        : Date.now();

      // Check for overlap
      if (clockIn < existingOut && clockOut > existingIn) {
        errors.push(`Time entry overlaps with existing entry for job ${existing.jobId}`);
      }
    });

    // Check for excessive hours (>16 hours in a day)
    const hours = (clockOut - clockIn) / (1000 * 60 * 60);
    if (hours > 16) {
      errors.push('Time entry exceeds 16 hours. Please verify.');
    }

    return errors;
  }

  /**
   * Calculate total expenses for a period
   */
  calculateTotalExpenses(expenses: Expense[]): number {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  /**
   * Group expenses by type
   */
  groupExpensesByType(expenses: Expense[]): Map<string, Expense[]> {
    const grouped = new Map<string, Expense[]>();
    
    expenses.forEach(expense => {
      if (!grouped.has(expense.type)) {
        grouped.set(expense.type, []);
      }
      grouped.get(expense.type)!.push(expense);
    });
    
    return grouped;
  }
}
