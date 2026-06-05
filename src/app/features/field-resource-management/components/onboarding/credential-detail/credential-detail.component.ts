import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { OnboardingService } from '../../../services/onboarding.service';
import { Candidate } from '../../../models/onboarding.models';
import { Technician, Certification, CertificationStatus } from '../../../models/technician.model';
import { RoleCredentialTemplate } from '../../../models/role-credential-template.model';
import { EquipmentAssignment } from '../../../models/equipment.model';
import { TechnicalCompetency } from '../../../models/competency.model';
import { PRC } from '../../../models/prc.model';
import { computeCredentialStatus } from '../../../utils/credential-status.util';
import { computeChecklistDelta, ChecklistSummary } from '../../../utils/checklist-delta.util';
import { TypedCredential } from '../../../models/credential-types.model';
import { CredentialFormModalComponent, CredentialFormModalData } from '../credential-form-modal/credential-form-modal.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteModalData } from '../confirm-delete-modal/confirm-delete-modal.component';
import { ToastrService } from 'ngx-toastr';

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

      <div *ngIf="technicianNotFound && !isLoading" class="not-found-state">
        <p class="not-found-message">Candidate not found</p>
        <button class="back-to-list-button" (click)="navigateBack()">Back to List</button>
      </div>

      <div *ngIf="errorMessage && !technicianNotFound && !isLoading" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="loadData()">Retry</button>
      </div>

      <div *ngIf="!isLoading && !errorMessage">
        <div class="back-navigation">
          <button class="back-to-list-button" (click)="navigateBack()">Back to List</button>
        </div>

        <div *ngIf="reloadErrorMessage" class="reload-error-state">
          <p class="reload-error-message">{{ reloadErrorMessage }}</p>
          <button class="dismiss-button" (click)="dismissReloadError()">Dismiss</button>
        </div>

        <app-onboarding-progress-header
          *ngIf="roleTemplate"
          [technician]="technician!"
          [checklistSummary]="checklistSummary"
          [prcIndicator]="prcIndicator">
        </app-onboarding-progress-header>

        <div id="section-credentials" class="section-container" tabindex="-1">
          <div class="section-header">
            <h3 class="section-title">Credentials</h3>
            <button class="add-credential-button" (click)="navigateToAdd()">Add Credential</button>
          </div>

          <div *ngIf="credentials.length === 0" class="empty-state">
            <p>No credentials on file</p>
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

        <div *ngIf="deleteErrorMessage" class="delete-error-state">
          <p class="delete-error-message">{{ deleteErrorMessage }}</p>
          <button class="retry-button" (click)="retryDelete()">Retry</button>
        </div>
        </div>

        <div id="section-equipment" tabindex="-1">
          <app-equipment-section
            [technicianId]="technicianId"
            [equipmentAssignments]="equipmentAssignments"
            (equipmentChanged)="reloadData()">
          </app-equipment-section>
        </div>

        <div id="section-competencies" tabindex="-1">
          <app-competency-section
            [technicianId]="technicianId"
            [competencies]="competencies"
            (competencyChanged)="reloadData()">
          </app-competency-section>
        </div>

        <div id="section-prc" tabindex="-1">
          <app-prc-section
            [technicianId]="technicianId"
            [prc]="prc"
            (prcChanged)="reloadData()">
          </app-prc-section>
        </div>

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

    .section-container {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-title {
      margin: 0;
      font-size: 1.125rem;
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

    .reload-error-state {
      padding: 1rem;
      margin-bottom: 1rem;
      background: #fff3e0;
      border: 1px solid #ffb74d;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .reload-error-message {
      color: #e65100;
      margin: 0;
      font-size: 0.875rem;
    }

    .dismiss-button {
      padding: 0.375rem 0.875rem;
      background-color: transparent;
      color: #e65100;
      border: 1px solid #e65100;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .dismiss-button:hover {
      background-color: rgba(230, 81, 0, 0.04);
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

    .back-navigation {
      margin-bottom: 1rem;
    }

    .back-to-list-button {
      padding: 0.5rem 1rem;
      background-color: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .back-to-list-button:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }

    .not-found-state {
      text-align: center;
      padding: 3rem 1rem;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .not-found-message {
      color: #d32f2f;
      margin-bottom: 1rem;
      font-size: 1rem;
      font-weight: 500;
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
  candidate: Candidate | null = null;
  technician: Technician | null = null;
  credentials: CredentialDisplay[] = [];
  equipmentAssignments: EquipmentAssignment[] = [];
  competencies: TechnicalCompetency[] = [];
  prc: PRC | null = null;
  checklistSummary: ChecklistSummary | null = null;
  roleTemplate: RoleCredentialTemplate | null = null;
  technicianNotFound = false;
  isLoading = false;
  errorMessage = '';
  deleteErrorMessage = '';
  reloadErrorMessage = '';

  candidateId = '';

  /** @deprecated kept for child component compatibility */
  get technicianId(): string { return this.candidateId; }

  private lastDeletedCredentialId = '';
  private subscriptions: Subscription[] = [];

  get prcIndicator(): 'upcoming' | 'overdue' | null {
    if (this.prc && (this.prc.status === 'overdue' || this.prc.status === 'upcoming')) {
      return this.prc.status;
    }
    return null;
  }

  constructor(
    private onboardingService: OnboardingService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.candidateId = this.route.snapshot.paramMap.get('candidateId') || '';
    this.loadData();

    // Handle section query param for deep-linking
    const section = this.route.snapshot.queryParamMap.get('section');
    if (section) {
      setTimeout(() => this.scrollToSection(section), 500);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const sub = this.onboardingService.getCandidateById(this.candidateId).subscribe({
      next: (candidate) => {
        this.candidate = candidate;
        this.technician = this.mapCandidateToTechnician(candidate);
        this.loadAllData();
      },
      error: (error) => {
        this.isLoading = false;
        if (error?.statusCode === 404 || error?.message?.includes('404')) {
          this.technicianNotFound = true;
          this.errorMessage = 'Candidate not found';
        } else {
          this.errorMessage = 'Unable to load credentials for this candidate.';
        }
      }
    });

    this.subscriptions.push(sub);
  }

  reloadData(): void {
    // Re-fetch the candidate from the API to get fresh data
    this.onboardingService.getCandidateById(this.candidateId).subscribe({
      next: (candidate) => {
        this.candidate = candidate;
        this.technician = this.mapCandidateToTechnician(candidate);
        this.loadAllData(true);
      },
      error: () => {
        this.reloadErrorMessage = 'Unable to refresh data.';
      }
    });
  }

  private loadAllData(isReload = false): void {
    if (!this.candidate) {
      this.isLoading = false;
      return;
    }

    // Fetch actual credential records from the API
    const credSub = this.onboardingService.getCandidateCredentials(this.candidateId).subscribe({
      next: (creds) => {
        if (creds && creds.length > 0) {
          // Use API-stored credentials
          this.credentials = this.sortCredentials(
            creds.map((cert: any) => ({
              credential: cert,
              computedStatus: cert.expirationDate ? computeCredentialStatus(new Date(cert.expirationDate)) : CertificationStatus.Active,
              credentialType: cert.credentialType || undefined
            }))
          );
        } else {
          // Fallback: build from candidate boolean fields
          this.credentials = this.buildCredentialsFromCandidate(this.candidate!);
        }
        this.isLoading = false;
        this.reloadErrorMessage = '';
      },
      error: () => {
        // Fallback: build from candidate boolean fields on error
        this.credentials = this.buildCredentialsFromCandidate(this.candidate!);
        this.isLoading = false;
        this.reloadErrorMessage = '';
      }
    });

    this.subscriptions.push(credSub);

    this.equipmentAssignments = this.buildEquipmentFromCandidate(this.candidate);
    this.competencies = [];
    this.prc = null;
  }

  private loadRoleTemplate(
    certifications: Certification[],
    equipment: EquipmentAssignment[],
    competencies: TechnicalCompetency[],
    prc: PRC | null
  ): void {
    // Candidates don't have role templates assigned yet
    this.roleTemplate = null;
    this.checklistSummary = null;
  }

  private sortCredentials(items: CredentialDisplay[]): CredentialDisplay[] {
    const statusOrder: Record<CertificationStatus, number> = {
      [CertificationStatus.Expired]: 0,
      [CertificationStatus.ExpiringSoon]: 1,
      [CertificationStatus.Active]: 2
    };

    return items.sort((a, b) => statusOrder[a.computedStatus] - statusOrder[b.computedStatus]);
  }

  navigateBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  navigateToAdd(): void {
    const dialogData: CredentialFormModalData = {
      technicianId: this.candidateId,
      technician: this.technician || undefined
    };

    const dialogRef = this.dialog.open(CredentialFormModalComponent, {
      width: '560px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reloadData();
      }
    });
  }

  navigateToEdit(credentialId: string): void {
    const credItem = this.credentials.find(c => c.credential.id === credentialId);
    if (!credItem) return;

    const dialogData: CredentialFormModalData = {
      technicianId: this.candidateId,
      technician: this.technician || undefined,
      credential: { ...credItem.credential, credentialType: credItem.credentialType }
    };

    const dialogRef = this.dialog.open(CredentialFormModalComponent, {
      width: '560px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reloadData();
      }
    });
  }

  navigateToChecklist(): void {
    this.router.navigate(['./checklist'], { relativeTo: this.route });
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.focus();
    }
  }

  deleteCredential(credentialId: string): void {
    const credItem = this.credentials.find(c => c.credential.id === credentialId);
    const dialogData: ConfirmDeleteModalData = {
      title: 'Delete Credential',
      message: 'Are you sure you want to delete this credential? This action cannot be undone.',
      itemName: credItem?.credential.name || 'Credential'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.lastDeletedCredentialId = credentialId;
        this.deleteErrorMessage = '';

        const deleteSub = this.onboardingService.deleteCandidateCredential(this.candidateId, credentialId).subscribe({
          next: () => {
            this.credentials = this.credentials.filter(c => c.credential.id !== credentialId);
            this.toastr.success('Credential deleted successfully', 'Deleted');
          },
          error: () => {
            this.toastr.error('Failed to delete credential. Please try again.', 'Error');
            this.deleteErrorMessage = 'Failed to delete credential. Please try again.';
          }
        });

        this.subscriptions.push(deleteSub);
      }
    });
  }

  retryDelete(): void {
    if (this.lastDeletedCredentialId) {
      this.deleteErrorMessage = '';
      const deleteSub = this.onboardingService.deleteCandidateCredential(this.candidateId, this.lastDeletedCredentialId).subscribe({
        next: () => {
          this.credentials = this.credentials.filter(c => c.credential.id !== this.lastDeletedCredentialId);
          this.toastr.success('Credential deleted successfully', 'Deleted');
        },
        error: () => {
          this.deleteErrorMessage = 'Failed to delete credential. Please try again.';
        }
      });

      this.subscriptions.push(deleteSub);
    }
  }

  dismissReloadError(): void {
    this.reloadErrorMessage = '';
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

  private mapCandidateToTechnician(candidate: Candidate): Technician {
    const nameParts = (candidate.techName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: candidate.candidateId,
      firstName,
      lastName,
      email: candidate.techEmail || '',
      phone: candidate.techPhone || '',
      role: '' as any,
      region: candidate.workSite || '',
      isAvailable: true,
      isActive: true,
      oshaCertified: candidate.oshaCertified || false,
      scissorLiftCertified: candidate.scissorLiftCertified || false,
      drugScreenStatus: candidate.drugTestComplete ? 'pass' : 'not_started',
      attBadge: candidate.attBadge ? true : false,
      attSupplierTraining: candidate.attSupplierTraining ? true : false,
      cienaBasicTraining: candidate.cienaBasicTraining ? true : false,
      googleRedBadge: candidate.googleRedBadge ? true : false,
      googleLdap: candidate.googleLdap ? true : false,
      metaGreenListing: candidate.metaGreenListing ? true : false,
      obsTraining: candidate.obsTraining ? true : false,
      osha10: candidate.osha10 || false,
      osha30: candidate.osha30 || false,
      techHandTools: candidate.techHandTools ? true : false,
      biisciCertified: candidate.biisciCertified || false,
      ciKitAssigned: candidate.ciKitAssigned || false,
      fiberKitAssigned: candidate.fiberKitAssigned || false,
      labelingKitAssigned: candidate.labelingKitAssigned || false,
      powerKitAssigned: candidate.powerKitAssigned || false,
      testingEqptAssigned: candidate.testingEqptAssigned || false,
      createdAt: new Date(candidate.createdAt),
      updatedAt: new Date(candidate.updatedAt)
    };
  }

  private buildCredentialsFromCandidate(candidate: Candidate): CredentialDisplay[] {
    const items: CredentialDisplay[] = [];
    const now = new Date();

    // Build credential entries from the candidate's boolean certification fields
    if (candidate.oshaCertified) {
      items.push({
        credential: { id: 'osha-cert', name: 'OSHA Certified', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Safety_Certification'
      });
    }

    if (candidate.osha10) {
      items.push({
        credential: { id: 'osha10', name: 'OSHA 10-Hour', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'OSHA_Training_Cert'
      });
    }

    if (candidate.osha30) {
      items.push({
        credential: { id: 'osha30', name: 'OSHA 30-Hour', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'OSHA_Training_Cert'
      });
    }

    if (candidate.scissorLiftCertified) {
      items.push({
        credential: { id: 'scissor-lift', name: 'Scissor Lift Certification', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Equipment_Certification'
      });
    }

    if (candidate.biisciCertified) {
      items.push({
        credential: { id: 'biisci', name: 'BICSI Certification', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Industry_Certification'
      });
    }

    if (candidate.drugTestComplete) {
      items.push({
        credential: { id: 'drug-screen', name: 'Pre-Employment Drug Screen', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Drug_Screen'
      });
    }

    if (candidate.attBadge) {
      items.push({
        credential: { id: 'att-badge', name: 'AT&T Badge', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Badge_Access'
      });
    }

    if (candidate.attSupplierTraining) {
      items.push({
        credential: { id: 'att-supplier', name: 'AT&T Supplier Training', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Training'
      });
    }

    if (candidate.cienaBasicTraining) {
      items.push({
        credential: { id: 'ciena-training', name: 'Ciena Basic Training', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Training'
      });
    }

    if (candidate.obsTraining) {
      items.push({
        credential: { id: 'obs-training', name: 'OBS Training', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Training'
      });
    }

    if (candidate.googleRedBadge) {
      items.push({
        credential: { id: 'google-red-badge', name: 'Google Red Badge', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Badge_Access'
      });
    }

    if (candidate.metaGreenListing) {
      items.push({
        credential: { id: 'meta-green', name: 'Meta Green Listing', issueDate: new Date(candidate.createdAt), expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), status: CertificationStatus.Active },
        computedStatus: CertificationStatus.Active,
        credentialType: 'Badge_Access'
      });
    }

    return this.sortCredentials(items);
  }

  private buildEquipmentFromCandidate(candidate: Candidate): EquipmentAssignment[] {
    const items: EquipmentAssignment[] = [];
    const dateStr = candidate.createdAt;

    if (candidate.ciKitAssigned) {
      items.push({ id: 'ci-kit', technicianId: candidate.candidateId, assetType: 'kit', assetIdentifier: 'CI Kit', assignmentDate: dateStr, status: 'assigned', createdAt: dateStr, updatedAt: dateStr });
    }
    if (candidate.fiberKitAssigned) {
      items.push({ id: 'fiber-kit', technicianId: candidate.candidateId, assetType: 'kit', assetIdentifier: 'Fiber Kit', assignmentDate: dateStr, status: 'assigned', createdAt: dateStr, updatedAt: dateStr });
    }
    if (candidate.labelingKitAssigned) {
      items.push({ id: 'labeling-kit', technicianId: candidate.candidateId, assetType: 'kit', assetIdentifier: 'Labeling Kit', assignmentDate: dateStr, status: 'assigned', createdAt: dateStr, updatedAt: dateStr });
    }
    if (candidate.powerKitAssigned) {
      items.push({ id: 'power-kit', technicianId: candidate.candidateId, assetType: 'kit', assetIdentifier: 'Power Kit', assignmentDate: dateStr, status: 'assigned', createdAt: dateStr, updatedAt: dateStr });
    }
    if (candidate.testingEqptAssigned) {
      items.push({ id: 'testing-eqpt', technicianId: candidate.candidateId, assetType: 'kit', assetIdentifier: 'Testing Equipment', assignmentDate: dateStr, status: 'assigned', createdAt: dateStr, updatedAt: dateStr });
    }

    return items;
  }
}
