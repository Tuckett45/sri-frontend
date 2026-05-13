import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TechnicianService } from '../../../services/technician.service';
import { Technician } from '../../../models/technician.model';
import { RoleCredentialTemplate } from '../../../models/role-credential-template.model';
import { TypedCredential } from '../../../models/credential-types.model';
import { EquipmentAssignment } from '../../../models/equipment.model';
import { TechnicalCompetency } from '../../../models/competency.model';
import { PRC } from '../../../models/prc.model';
import { computeChecklistDelta, ChecklistSummary, ChecklistItem } from '../../../utils/checklist-delta.util';

@Component({
  selector: 'app-onboarding-checklist',
  template: `
    <div class="checklist-container">
      <div *ngIf="isLoading" class="loading-state">
        <p>Loading onboarding checklist...</p>
      </div>

      <div *ngIf="errorMessage && !isLoading" class="error-state">
        <p class="error-message">Unable to load onboarding checklist. Please try again.</p>
        <button class="retry-button" (click)="loadData()">Retry</button>
      </div>

      <div *ngIf="!isLoading && !errorMessage && summary">
        <div class="checklist-header">
          <h2 class="checklist-title">
            Onboarding Checklist — {{ technician?.firstName }} {{ technician?.lastName }}
          </h2>
          <div class="ready-indicator" *ngIf="summary.isReadyToStart">
            <span class="ready-badge">&#x2714; Ready to Start</span>
          </div>
        </div>

        <div class="checklist-summary">
          <p class="summary-text">
            {{ summary.completeCount }} of {{ summary.totalCount }} items complete ({{ summary.completionPercentage | number:'1.0-0' }}%)
          </p>
          <div class="summary-counts">
            <span class="count-complete">Complete: {{ summary.completeCount }}</span>
            <span class="count-missing">Missing: {{ summary.missingCount }}</span>
            <span class="count-expired">Expired: {{ summary.expiredCount }}</span>
          </div>
        </div>

        <div class="checklist-categories">
          <div *ngIf="credentialItems.length > 0" class="category-group">
            <h3 class="category-title">Credentials</h3>
            <div *ngFor="let item of credentialItems" class="checklist-item" [ngClass]="getItemClass(item)">
              <span class="item-icon" [innerHTML]="getItemIcon(item)"></span>
              <span class="item-name">{{ item.name }}</span>
              <a *ngIf="item.status === 'missing'" class="add-link" (click)="navigateToCredentialForm()">Add</a>
            </div>
          </div>

          <div *ngIf="equipmentItems.length > 0" class="category-group">
            <h3 class="category-title">Equipment</h3>
            <div *ngFor="let item of equipmentItems" class="checklist-item" [ngClass]="getItemClass(item)">
              <span class="item-icon" [innerHTML]="getItemIcon(item)"></span>
              <span class="item-name">{{ item.name }}</span>
              <a *ngIf="item.status === 'missing'" class="add-link" (click)="navigateToEquipmentForm()">Add</a>
            </div>
          </div>

          <div *ngIf="competencyItems.length > 0" class="category-group">
            <h3 class="category-title">Competencies</h3>
            <div *ngFor="let item of competencyItems" class="checklist-item" [ngClass]="getItemClass(item)">
              <span class="item-icon" [innerHTML]="getItemIcon(item)"></span>
              <span class="item-name">{{ item.name }}</span>
              <span *ngIf="item.status === 'missing'" class="not-verified-label">Not Verified</span>
              <a *ngIf="item.status === 'missing'" class="add-link" (click)="navigateToCompetencyForm()">Add</a>
            </div>
          </div>

          <div *ngIf="prcItems.length > 0" class="category-group">
            <h3 class="category-title">PRC</h3>
            <div *ngFor="let item of prcItems" class="checklist-item" [ngClass]="getItemClass(item)">
              <span class="item-icon" [innerHTML]="getItemIcon(item)"></span>
              <span class="item-name">{{ item.name }}</span>
              <a *ngIf="item.status === 'missing'" class="add-link" (click)="navigateToPRCForm()">Add</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checklist-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .loading-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .error-state {
      text-align: center;
      padding: 40px;
      background: #fff3f3;
      border-radius: 8px;
      border: 1px solid #f44336;
    }

    .error-message {
      color: #f44336;
      margin-bottom: 16px;
    }

    .retry-button {
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .retry-button:hover {
      background: #1565c0;
    }

    .checklist-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .checklist-title {
      font-size: 1.5rem;
      color: #333;
      margin: 0;
    }

    .ready-indicator {
      display: flex;
      align-items: center;
    }

    .ready-badge {
      background: #e8f5e9;
      color: #4caf50;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .checklist-summary {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .summary-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 8px 0;
    }

    .summary-counts {
      display: flex;
      gap: 16px;
    }

    .count-complete {
      color: #4caf50;
      font-weight: 500;
    }

    .count-missing {
      color: #f44336;
      font-weight: 500;
    }

    .count-expired {
      color: #ff9800;
      font-weight: 500;
    }

    .checklist-categories {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .category-group {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
    }

    .category-title {
      font-size: 1.1rem;
      color: #555;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .checklist-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: 4px;
      margin-bottom: 4px;
      gap: 10px;
    }

    .checklist-item.status-complete {
      background: #f1f8e9;
    }

    .checklist-item.status-missing {
      background: #fce4ec;
    }

    .checklist-item.status-expired {
      background: #fff3e0;
    }

    .item-icon {
      font-size: 1.1rem;
      width: 24px;
      text-align: center;
    }

    .item-name {
      flex: 1;
      color: #333;
    }

    .not-verified-label {
      color: #f44336;
      font-size: 0.85rem;
      font-weight: 500;
      margin-right: 8px;
    }

    .add-link {
      color: #1976d2;
      cursor: pointer;
      font-size: 0.9rem;
      text-decoration: underline;
    }

    .add-link:hover {
      color: #1565c0;
    }
  `]
})
export class OnboardingChecklistComponent implements OnInit, OnDestroy {
  technicianId: string = '';
  technician: Technician | null = null;
  summary: ChecklistSummary | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  credentialItems: ChecklistItem[] = [];
  equipmentItems: ChecklistItem[] = [];
  competencyItems: ChecklistItem[] = [];
  prcItems: ChecklistItem[] = [];

  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private technicianService: TechnicianService
  ) {}

  ngOnInit(): void {
    this.technicianId = this.route.snapshot.paramMap.get('technicianId') || '';
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const sub = this.technicianService.getTechnicianById(this.technicianId).pipe(
      switchMap((technician) => {
        this.technician = technician;
        return forkJoin({
          template: this.technicianService.getRoleCredentialTemplate(technician.role),
          credentials: this.technicianService.getTechnicianCertifications(this.technicianId),
          equipment: this.technicianService.getTechnicianEquipment(this.technicianId),
          competencies: this.technicianService.getTechnicianCompetencies(this.technicianId),
          prc: this.technicianService.getTechnicianPRC(this.technicianId)
        });
      })
    ).subscribe({
      next: (data) => {
        this.summary = computeChecklistDelta(
          data.template,
          data.credentials as unknown as TypedCredential[],
          data.equipment,
          data.competencies,
          data.prc
        );
        this.groupItemsByCategory();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load onboarding checklist. Please try again.';
        this.isLoading = false;
      }
    });

    this.subscriptions.add(sub);
  }

  private groupItemsByCategory(): void {
    if (!this.summary) return;
    this.credentialItems = this.summary.items.filter(i => i.category === 'credential');
    this.equipmentItems = this.summary.items.filter(i => i.category === 'equipment');
    this.competencyItems = this.summary.items.filter(i => i.category === 'competency');
    this.prcItems = this.summary.items.filter(i => i.category === 'prc');
  }

  getItemClass(item: ChecklistItem): string {
    return `status-${item.status}`;
  }

  getItemIcon(item: ChecklistItem): string {
    switch (item.status) {
      case 'complete':
        return '<span style="color: #4caf50;">&#x2714;</span>';
      case 'missing':
        return '<span style="color: #f44336;">&#x2718;</span>';
      case 'expired':
        return '<span style="color: #ff9800;">&#x26A0;</span>';
      default:
        return '';
    }
  }

  navigateToCredentialForm(): void {
    this.router.navigate(['../', 'new'], { relativeTo: this.route });
  }

  navigateToEquipmentForm(): void {
    this.router.navigate(['../', this.technicianId], { relativeTo: this.route.parent?.parent });
  }

  navigateToCompetencyForm(): void {
    this.router.navigate(['../', this.technicianId], { relativeTo: this.route.parent?.parent });
  }

  navigateToPRCForm(): void {
    this.router.navigate(['../', this.technicianId], { relativeTo: this.route.parent?.parent });
  }
}
