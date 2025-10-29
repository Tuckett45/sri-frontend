import { Injectable } from '@angular/core';
import { 
  DailyUpdate, 
  Blocker, 
  RMAEntry, 
  CompletedRMAEntry, 
  ResolvedBlocker,
  ScopeProgress,
  BlockerCategory,
  BlockerSeverity,
  RMAStatus
} from '../models/daily-update.model';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private sites = [
    'TUL40-1-2', 'DAL35-2-1', 'HOU42-3-4', 'ATL28-1-3', 
    'MIA33-2-2', 'NYC15-4-1', 'LAX55-1-1', 'CHI22-3-2'
  ];

  private pmNames = [
    'John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Chen',
    'Robert Wilson', 'Emily Brown', 'David Martinez', 'Jennifer Taylor'
  ];

  private sowDescriptions = [
    '3 WSAI RSW, Cat5e, Fiber, Config and Troubleshoot',
    '2 WSAI Installation, Cat6 Cabling, Network Config',
    '4 WSAI Deployment, Fiber Termination, Testing',
    '1 WSAI Upgrade, Equipment Replacement, Validation',
    '5 WSAI Rollout, Infrastructure Setup, Go-Live'
  ];

  private scopeTypes = [
    'WSAI Installation', 'Cabling', 'Fiber Termination', 
    'Network Configuration', 'Equipment Testing', 'Site Preparation'
  ];

  generateMockDailyUpdates(count: number = 20): DailyUpdate[] {
    const updates: DailyUpdate[] = [];
    
    for (let i = 0; i < count; i++) {
      const update: DailyUpdate = {
        id: `update-${i + 1}`,
        bugNumber: `B/${1000 + i}`,
        endOfDay: this.getRandomDate(30),
        site: this.getRandomItem(this.sites),
        pmNames: this.getRandomPMs(),
        sow: this.getRandomItem(this.sowDescriptions),
        siteRackLocation: this.getRandomItem(this.sites),
        installBegin: this.getRandomDate(45),
        googleExpectedCompleteDate: this.getRandomFutureDate(30),
        trackingCompleteDate: Math.random() > 0.7 ? this.getRandomFutureDate(15) : null,
        installPercentComplete: this.generateScopeProgress(),
        testPercentComplete: this.generateTestProgress(),
        completedActivity: this.generateCompletedActivity(),
        plannedActivity: this.generatePlannedActivity(),
        activeBlockers: this.generateActiveBlockers(),
        openRMA: this.generateOpenRMAs(),
        notes: this.generateNotes(),
        resolvedBlockers: this.generateResolvedBlockers(),
        rmaLog: this.generateRMALog(),
        createdBy: this.getRandomItem(this.pmNames),
        createdAt: this.getRandomDate(30),
        updatedAt: this.getRandomDate(5)
      };
      
      updates.push(update);
    }
    
    return updates;
  }

  private getRandomDate(daysBack: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
    return date;
  }

  private getRandomFutureDate(daysForward: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysForward));
    return date;
  }

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomPMs(): string[] {
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 PMs
    const selected = new Set<string>();
    
    while (selected.size < count) {
      selected.add(this.getRandomItem(this.pmNames));
    }
    
    return Array.from(selected);
  }

  private generateScopeProgress(): ScopeProgress[] {
    const scopes = this.getRandomItems(this.scopeTypes, Math.floor(Math.random() * 4) + 2);
    return scopes.map(scope => ({
      scope,
      percentage: Math.floor(Math.random() * 101),
      description: `${scope} progress update`
    }));
  }

  private generateTestProgress(): ScopeProgress[] {
    if (Math.random() > 0.6) return []; // Not all updates have test progress
    
    const testScopes = ['Connectivity Testing', 'Performance Testing', 'Integration Testing'];
    const scopes = this.getRandomItems(testScopes, Math.floor(Math.random() * 2) + 1);
    return scopes.map(scope => ({
      scope,
      percentage: Math.floor(Math.random() * 101),
      description: `${scope} completion status`
    }));
  }

  private generateCompletedActivity(): string {
    const activities = [
      'Completed fiber termination for rack 1-2',
      'Installed and configured 3 WSAI units',
      'Finished Cat5e cabling for floors 1-3',
      'Completed network configuration and testing',
      'Resolved connectivity issues with main switch',
      'Finished equipment installation in server room'
    ];
    return this.getRandomItem(activities);
  }

  private generatePlannedActivity(): string {
    const activities = [
      'Begin fiber testing and validation',
      'Install remaining WSAI units on floor 4',
      'Complete network configuration for new equipment',
      'Perform final connectivity testing',
      'Schedule go-live activities with client',
      'Complete documentation and handover'
    ];
    return this.getRandomItem(activities);
  }

  private generateActiveBlockers(): Blocker[] {
    if (Math.random() > 0.4) return []; // 60% chance of no blockers
    
    const blockerCount = Math.floor(Math.random() * 3) + 1;
    const blockers: Blocker[] = [];
    
    const blockerDescriptions = [
      'Fiber cable not delivered to site',
      'Additional scope requested by client',
      'Site access restricted due to security protocols',
      'Equipment failure requiring RMA',
      'Weather conditions preventing outdoor work',
      'Coordination issues with other contractors'
    ];

    for (let i = 0; i < blockerCount; i++) {
      blockers.push({
        id: `blocker-${Date.now()}-${i}`,
        description: this.getRandomItem(blockerDescriptions),
        ticketNumber: Math.random() > 0.5 ? `TKT-${1000 + Math.floor(Math.random() * 9000)}` : undefined,
        category: this.getRandomItem(Object.values(BlockerCategory)),
        severity: this.getRandomItem(Object.values(BlockerSeverity)),
        reportedDate: this.getRandomDate(7)
      });
    }
    
    return blockers;
  }

  private generateOpenRMAs(): RMAEntry[] {
    if (Math.random() > 0.3) return []; // 70% chance of no open RMAs
    
    const rmaCount = Math.floor(Math.random() * 2) + 1;
    const rmas: RMAEntry[] = [];
    
    const equipmentTypes = [
      'WSAI Unit', 'Network Switch', 'Fiber Transceiver', 
      'Power Supply', 'Cooling Fan', 'Cable Management'
    ];

    for (let i = 0; i < rmaCount; i++) {
      rmas.push({
        id: `rma-${Date.now()}-${i}`,
        equipmentType: this.getRandomItem(equipmentTypes),
        serialNumber: `SN${Math.floor(Math.random() * 1000000)}`,
        failureDescription: 'Equipment failure requiring replacement',
        reportedDate: this.getRandomDate(14),
        status: this.getRandomItem(Object.values(RMAStatus))
      });
    }
    
    return rmas;
  }

  private generateNotes(): string {
    const notes = [
      'Site access coordinated with facility management',
      'Client requested additional testing procedures',
      'Weather delays expected for outdoor work',
      'Coordination meeting scheduled with other vendors',
      'Equipment delivery confirmed for next week',
      'All safety protocols reviewed and approved'
    ];
    
    if (Math.random() > 0.3) {
      return this.getRandomItem(notes);
    }
    return '';
  }

  private generateResolvedBlockers(): ResolvedBlocker[] {
    if (Math.random() > 0.6) return []; // 40% chance of resolved blockers
    
    const resolvedCount = Math.floor(Math.random() * 2) + 1;
    const resolved: ResolvedBlocker[] = [];
    
    for (let i = 0; i < resolvedCount; i++) {
      resolved.push({
        id: `resolved-${Date.now()}-${i}`,
        originalBlockerId: `blocker-old-${i}`,
        description: 'Material delivery issue resolved',
        mitigationDate: this.getRandomDate(3),
        resolution: 'Alternative supplier provided required materials'
      });
    }
    
    return resolved;
  }

  private generateRMALog(): CompletedRMAEntry[] {
    if (Math.random() > 0.7) return []; // 30% chance of completed RMAs
    
    const completedCount = Math.floor(Math.random() * 2) + 1;
    const completed: CompletedRMAEntry[] = [];
    
    for (let i = 0; i < completedCount; i++) {
      completed.push({
        id: `completed-rma-${Date.now()}-${i}`,
        originalRMAId: `rma-old-${i}`,
        equipmentType: 'WSAI Unit',
        serialNumber: `SN${Math.floor(Math.random() * 1000000)}`,
        completionDate: this.getRandomDate(7),
        rmaNumber: `RMA-${Math.floor(Math.random() * 100000)}`,
        replacementSerialNumber: `SN${Math.floor(Math.random() * 1000000)}`
      });
    }
    
    return completed;
  }

  private getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }
}

