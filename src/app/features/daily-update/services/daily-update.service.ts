import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { DailyUpdate, DailyUpdateSummary, DailyUpdateFilter } from '../models/daily-update.model';
import { MockDataService } from './mock-data.service';

@Injectable({
  providedIn: 'root'
})
export class DailyUpdateService {
  private dailyUpdatesSubject = new BehaviorSubject<DailyUpdate[]>([]);
  public dailyUpdates$ = this.dailyUpdatesSubject.asObservable();

  constructor(private mockDataService: MockDataService) {
    // Initialize with mock data
    const mockData = this.mockDataService.generateMockDailyUpdates(25);
    this.dailyUpdatesSubject.next(mockData);
  }

  getDailyUpdates(filter?: DailyUpdateFilter): Observable<DailyUpdate[]> {
    return this.dailyUpdates$.pipe(
      map(updates => this.applyFilter(updates, filter)),
      delay(300) // Simulate API delay
    );
  }

  getDailyUpdateById(id: string): Observable<DailyUpdate | null> {
    return this.dailyUpdates$.pipe(
      map(updates => updates.find(update => update.id === id) || null),
      delay(200)
    );
  }

  createDailyUpdate(update: Omit<DailyUpdate, 'id' | 'createdAt' | 'updatedAt'>): Observable<DailyUpdate> {
    const newUpdate: DailyUpdate = {
      ...update,
      id: `update-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentUpdates = this.dailyUpdatesSubject.value;
    this.dailyUpdatesSubject.next([newUpdate, ...currentUpdates]);

    return of(newUpdate).pipe(delay(500));
  }

  updateDailyUpdate(id: string, update: Partial<DailyUpdate>): Observable<DailyUpdate | null> {
    const currentUpdates = this.dailyUpdatesSubject.value;
    const index = currentUpdates.findIndex(u => u.id === id);

    if (index === -1) {
      return of(null);
    }

    const updatedUpdate: DailyUpdate = {
      ...currentUpdates[index],
      ...update,
      updatedAt: new Date()
    };

    const newUpdates = [...currentUpdates];
    newUpdates[index] = updatedUpdate;
    this.dailyUpdatesSubject.next(newUpdates);

    return of(updatedUpdate).pipe(delay(400));
  }

  deleteDailyUpdate(id: string): Observable<boolean> {
    const currentUpdates = this.dailyUpdatesSubject.value;
    const filteredUpdates = currentUpdates.filter(update => update.id !== id);
    
    if (filteredUpdates.length === currentUpdates.length) {
      return of(false); // Update not found
    }

    this.dailyUpdatesSubject.next(filteredUpdates);
    return of(true).pipe(delay(300));
  }

  getDailyUpdateSummary(): Observable<DailyUpdateSummary> {
    return this.dailyUpdates$.pipe(
      map(updates => this.calculateSummary(updates)),
      delay(200)
    );
  }

  getRecentUpdates(limit: number = 5): Observable<DailyUpdate[]> {
    return this.dailyUpdates$.pipe(
      map(updates => 
        updates
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, limit)
      ),
      delay(200)
    );
  }

  getUpdatesByDateRange(startDate: Date, endDate: Date): Observable<DailyUpdate[]> {
    return this.dailyUpdates$.pipe(
      map(updates => 
        updates.filter(update => 
          update.endOfDay >= startDate && update.endOfDay <= endDate
        )
      ),
      delay(300)
    );
  }

  getUpdatesBySite(site: string): Observable<DailyUpdate[]> {
    return this.dailyUpdates$.pipe(
      map(updates => updates.filter(update => update.site === site)),
      delay(200)
    );
  }

  getUpdatesWithActiveBlockers(): Observable<DailyUpdate[]> {
    return this.dailyUpdates$.pipe(
      map(updates => updates.filter(update => update.activeBlockers.length > 0)),
      delay(200)
    );
  }

  getUpdatesWithOpenRMAs(): Observable<DailyUpdate[]> {
    return this.dailyUpdates$.pipe(
      map(updates => updates.filter(update => update.openRMA.length > 0)),
      delay(200)
    );
  }

  getSiteList(): Observable<string[]> {
    return this.dailyUpdates$.pipe(
      map(updates => {
        const sites = new Set(updates.map(update => update.site));
        return Array.from(sites).sort();
      })
    );
  }

  getPMList(): Observable<string[]> {
    return this.dailyUpdates$.pipe(
      map(updates => {
        const pms = new Set<string>();
        updates.forEach(update => {
          update.pmNames.forEach(pm => pms.add(pm));
        });
        return Array.from(pms).sort();
      })
    );
  }

  private applyFilter(updates: DailyUpdate[], filter?: DailyUpdateFilter): DailyUpdate[] {
    if (!filter) return updates;

    return updates.filter(update => {
      // Date range filter
      if (filter.dateRange) {
        const updateDate = update.endOfDay;
        if (updateDate < filter.dateRange.start || updateDate > filter.dateRange.end) {
          return false;
        }
      }

      // Sites filter
      if (filter.sites && filter.sites.length > 0) {
        if (!filter.sites.includes(update.site)) {
          return false;
        }
      }

      // PM names filter
      if (filter.pmNames && filter.pmNames.length > 0) {
        const hasMatchingPM = update.pmNames.some(pm => filter.pmNames!.includes(pm));
        if (!hasMatchingPM) {
          return false;
        }
      }

      // Has blockers filter
      if (filter.hasBlockers !== undefined) {
        const hasBlockers = update.activeBlockers.length > 0;
        if (filter.hasBlockers !== hasBlockers) {
          return false;
        }
      }

      // Has open RMAs filter
      if (filter.hasOpenRMAs !== undefined) {
        const hasOpenRMAs = update.openRMA.length > 0;
        if (filter.hasOpenRMAs !== hasOpenRMAs) {
          return false;
        }
      }

      // Install progress range filter
      if (filter.installProgressRange) {
        const avgProgress = this.calculateAverageProgress(update.installPercentComplete);
        if (avgProgress < filter.installProgressRange.min || avgProgress > filter.installProgressRange.max) {
          return false;
        }
      }

      return true;
    });
  }

  private calculateSummary(updates: DailyUpdate[]): DailyUpdateSummary {
    const totalReports = updates.length;
    const activeBlockers = updates.reduce((sum, update) => sum + update.activeBlockers.length, 0);
    const openRMAs = updates.reduce((sum, update) => sum + update.openRMA.length, 0);
    
    const installProgressSum = updates.reduce((sum, update) => 
      sum + this.calculateAverageProgress(update.installPercentComplete), 0
    );
    const averageInstallProgress = totalReports > 0 ? installProgressSum / totalReports : 0;
    
    const testProgressSum = updates.reduce((sum, update) => 
      sum + this.calculateAverageProgress(update.testPercentComplete), 0
    );
    const averageTestProgress = totalReports > 0 ? testProgressSum / totalReports : 0;
    
    const sitesWithIssues = new Set(
      updates
        .filter(update => update.activeBlockers.length > 0 || update.openRMA.length > 0)
        .map(update => update.site)
    ).size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = updates.filter(update => {
      const updateDate = new Date(update.endOfDay);
      updateDate.setHours(0, 0, 0, 0);
      return updateDate.getTime() === today.getTime();
    }).length;

    return {
      totalReports,
      activeBlockers,
      openRMAs,
      averageInstallProgress: Math.round(averageInstallProgress),
      averageTestProgress: Math.round(averageTestProgress),
      sitesWithIssues,
      completedToday
    };
  }

  private calculateAverageProgress(progressArray: { percentage: number }[]): number {
    if (progressArray.length === 0) return 0;
    const sum = progressArray.reduce((acc, item) => acc + item.percentage, 0);
    return sum / progressArray.length;
  }
}

