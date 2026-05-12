import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { TechnicianService } from '../../../services/technician.service';
import { Technician, Certification, CertificationStatus } from '../../../models/technician.model';
import { EquipmentAssignment } from '../../../models/equipment.model';
import { TechnicalCompetency } from '../../../models/competency.model';
import { PRC } from '../../../models/prc.model';
import { computeCredentialStatus } from '../../../utils/credential-status.util';

interface CredentialDisplay {
  credential: Certification;
  computedStatus: CertificationStatus;
  credentialType?: string;
}

@Component({
  selector: 'app-credential-detail',
  template: `
    <div class="credential-detail-container">
      <div *ngIf="isLoading" class="loading-state">
        <p>Loading credentials...</p>
      </div>

      <div *ngIf="errorMessage && !isLoading" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="loadData()">Retry</button>
      </div>

      <div *ngIf="!isLoading && !errorMessage">
        <div class="credential-detail-header">
          <h2 class="credential-detail-title">
            {{ technician?.firstName }} {{ technician?.lastName }} — Credentials
          </h2>
          <button class="add-credential-button" (click)="navigateToAdd()">Add Credential</button>
        </div>

        <div *ngIf="deleteErrorMessage" class="delete-error-state">
          <p class="delete-error-message">{{ deleteErrorMessage }}</p>
          <button class="retry-button" (click)="retryDelete()">Retry</button>
        </div>

        <div *ngIf="credentials.length === 0" class="empty-state">
          <p>No credentials on file</p>
          <button class="add-credential-button" (click)="navigateToAdd()">Add Credential</button>
        </div>

        <div *ngIf="credentials.length > 0" class="credentials-grid">
          <div
            *ngFor="let item of credentials"
            class="credential-card"
            [ngClass]="getStatusClass(item.computedStatus)"
          >
            <div class="credential-card-header">
              <span class="credential-name">{{ item.credential.name }}</span>
              <span class="status-badge" [ngClass]="getStatusBadgeClass(item.computedStatus)">
                {{ item.computedStatus }}
              </span>
            </div>
            <div class="credential-card-body">
              <div class="credential-field" *ngIf="item.credentialType">
                <span class="field-label">Type</span>
                <span class="field-value">{{ formatCredentialType(item.credentialType) }}</span>
              </div>
              <div class="credential-field">
                <span class="field-label">Issue Date</span>
                <span class="field-value">{{ formatDate(item.credential.issueDate) }}</span>
              </div>
              <div class="credential-field">
                <span class="field-label">Expiration Date</span>
                <span class="field-value">{{ formatDate(item.credential.expirationDate) }}</span>
              </div>
            </div>
            <div class="credential-card-actions">
              <button class="edit-button" (click)="navigateToEdit(item.credential.id)">Edit</button>
              <button class="delete-button" (click)="deleteCredential(item.credential.id)">Delete</button>
            </div>
          </div>
        </div>

        <app-equipment-section
          [technicianId]="technicianId"
          [equipmentAssignments]="equipmentAssignments"
          (equipmentChanged)="reloadData()">
        </app-equipment-section>

        <app-competency-section
          [technicianId]="technicianId"
          [competencies]="competencies"
          (competencyChanged)="reloadData()">
        </app-competency-section>

        <app-prc-section
          [technicianId]="technicianId"
          [prc]="prc"
          (prcChanged)="reloadData()">
        </app-prc-section>

        <div class="checklist-button-container">
          <button class="checklist-button" (click)="navigateToChecklist()">View Onboarding Checklist</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .credential-detail-container {
      padding: 1.5rem;
      background-color: #f5f7fa;
      min-height: 100%;
    }

    .credential-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .credential-detail-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #212121;
    }

    .add-credential-button {
      padding: 0.5rem 1.25rem;
      background-color: #1976d2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .add-credential-button:hover {
      background-color: #1565c0;
    }

    .loading-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #616161;
    }

    .error-state {
      text-align: center;
      padding: 3rem 1rem;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .error-message {
      color: #d32f2f;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .delete-error-state {
      padding: 1rem;
      margin-bottom: 1rem;
      background: #ffebee;
      border: 1px solid #ef9a9a;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .delete-error-message {
      color: #c62828;
      margin: 0;
      font-size: 0.875rem;
    }

    .retry-button {
      padding: 0.5rem 1.25rem;
      background-color: #1976d2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .retry-button:hover {
      background-color: #1565c0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #616161;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .empty-state p {
      margin-bottom: 1rem;
    }

    .credentials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }

    .credential-card {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1rem;
      border-left: 4px solid #e0e0e0;
      transition: box-shadow 0.2s;
    }

    .credential-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .credential-card.status-active {
      border-left-color: #4caf50;
    }

    .credential-card.status-expiring-soon {
      border-left-color: #ff9800;
    }

    .credential-card.status-expired {
      border-left-color: #f44336;
    }

    .credential-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .credential-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #212121;
    }

    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.badge-active {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.badge-expiring-soon {
      background-color: #fff3e0;
      color: #e65100;
    }

    .status-badge.badge-expired {
      background-color: #ffebee;
      color: #c62828;
    }

    .credential-card-body {
      margin-bottom: 0.75rem;
    }

    .credential-field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
    }

    .field-label {
      font-size: 0.75rem;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .field-value {
      font-size: 0.875rem;
      color: #212121;
    }

    .credential-card-actions {
      display: flex;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f0f0f0;
    }

    .edit-button {
      padding: 0.375rem 0.875rem;
      background-color: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .edit-button:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }

    .delete-button {
      padding: 0.375rem 0.875rem;
      background-color: transparent;
      color: #d32f2f;
      border: 1px solid #d32f2f;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .delete-button:hover {
      background-color: rgba(211, 47, 47, 0.04);
    }

    .checklist-button-container {
      margin-top: 2rem;
      text-align: center;
    }

    .checklist-button {
      padding: 0.625rem 1.5rem;
      background-color: #388e3c;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .checklist-button:hover {
      background-color: #2e7d32;
    }

    @media (max-width: 768px) {
      .credential-detail-container {
        padding: 1rem;
      }

      .credential-detail-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .credentials-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CredentialDetailComponent implements OnInit, OnDestroy {
  technician: Technician | null = null;
  credentials: CredentialDisplay[] = [];
  equipmentAssignments: EquipmentAssignment[] = [];
  competencies: TechnicalCompetency[] = [];
  prc: PRC | null = null;
  isLoading = false;
  errorMessage = '';
  deleteErrorMessage = '';

  technicianId = '';
  private lastDeletedCredentialId = '';
  private subscriptions: Subscription[] = [];

  constructor(
    private technicianService: TechnicianService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.technicianId = this.route.snapshot.paramMap.get('technicianId') || '';
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const techSub = this.technicianService.getTechnicianById(this.technicianId).subscribe({
      next: (technician) => {
        this.technician = technician;
        this.loadAllData();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load credentials for this technician.';
      }
    });

    this.subscriptions.push(techSub);
  }

  reloadData(): void {
    this.loadAllData();
  }

  private loadAllData(): void {
    const dataSub = forkJoin({
      certifications: this.technicianService.getTechnicianCertifications(this.technicianId),
      equipment: this.technicianService.getTechnicianEquipment(this.technicianId),
      competencies: this.technicianService.getTechnicianCompetencies(this.technicianId),
      prc: this.technicianService.getTechnicianPRC(this.technicianId)
    }).subscribe({
      next: (result) => {
        this.credentials = this.sortCredentials(
          result.certifications.map(cert => ({
            credential: cert,
            computedStatus: computeCredentialStatus(new Date(cert.expirationDate)),
            credentialType: (cert as any).credentialType || undefined
          }))
        );
        this.equipmentAssignments = result.equipment;
        this.competencies = result.competencies;
        this.prc = result.prc;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load credentials for this technician.';
      }
    });

    this.subscriptions.push(dataSub);
  }

  private sortCredentials(items: CredentialDisplay[]): CredentialDisplay[] {
    const statusOrder: Record<CertificationStatus, number> = {
      [CertificationStatus.Expired]: 0,
      [CertificationStatus.ExpiringSoon]: 1,
      [CertificationStatus.Active]: 2
    };

    return items.sort((a, b) => statusOrder[a.computedStatus] - statusOrder[b.computedStatus]);
  }

  navigateToAdd(): void {
    this.router.navigate(['../new'], { relativeTo: this.route });
  }

  navigateToEdit(credentialId: string): void {
    this.router.navigate([`../edit/${credentialId}`], { relativeTo: this.route });
  }

  navigateToChecklist(): void {
    this.router.navigate(['./checklist'], { relativeTo: this.route });
  }

  deleteCredential(credentialId: string): void {
    const confirmed = window.confirm('Are you sure you want to delete this credential? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    this.lastDeletedCredentialId = credentialId;
    this.deleteErrorMessage = '';

    const deleteSub = this.technicianService.deleteTechnicianCertification(this.technicianId, credentialId).subscribe({
      next: () => {
        this.reloadData();
      },
      error: () => {
        this.deleteErrorMessage = 'Failed to delete credential. Please try again.';
      }
    });

    this.subscriptions.push(deleteSub);
  }

  retryDelete(): void {
    if (this.lastDeletedCredentialId) {
      this.deleteErrorMessage = '';
      const deleteSub = this.technicianService.deleteTechnicianCertification(this.technicianId, this.lastDeletedCredentialId).subscribe({
        next: () => {
          this.reloadData();
        },
        error: () => {
          this.deleteErrorMessage = 'Failed to delete credential. Please try again.';
        }
      });

      this.subscriptions.push(deleteSub);
    }
  }

  getStatusClass(status: CertificationStatus): string {
    switch (status) {
      case CertificationStatus.Active:
        return 'status-active';
      case CertificationStatus.ExpiringSoon:
        return 'status-expiring-soon';
      case CertificationStatus.Expired:
        return 'status-expired';
      default:
        return '';
    }
  }

  getStatusBadgeClass(status: CertificationStatus): string {
    switch (status) {
      case CertificationStatus.Active:
        return 'badge-active';
      case CertificationStatus.ExpiringSoon:
        return 'badge-expiring-soon';
      case CertificationStatus.Expired:
        return 'badge-expired';
      default:
        return '';
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCredentialType(type: string): string {
    return type.replace(/_/g, ' ');
  }
}
