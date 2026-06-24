import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Observable } from 'rxjs';
import { OnboardingService } from '../../../services/onboarding.service';
import { Candidate, OfferStatus } from '../../../models/onboarding.models';
import { OnboardingInfoModalComponent } from '../onboarding-info-modal/onboarding-info-modal.component';
import { AddCandidateModalComponent } from '../add-candidate-modal/add-candidate-modal.component';
import { getValidTransitions } from '../../../utils/offer-status.util';

const STATUS_LABELS: Record<OfferStatus, string> = {
  needs_review: 'Needs Review',
  vetted_available: 'Vetted/Available',
  offer_extended: 'Offer Extended',
  offer_accepted_onboarding: 'Offer Accepted/Onboarding',
  hired_assigned: 'Hired/Assigned',
  do_not_hire: 'Do Not Hire',
  turned_down_hold: 'Turned Down/Hold for Later',
};

@Component({
  selector: 'app-candidate-detail',
  template: `
    <div class="candidate-detail-container">
      <div *ngIf="loading" class="loading-state">Loading candidate...</div>

      <div *ngIf="!loading && !candidate" class="not-found-state">
        <p>Candidate not found</p>
        <button class="btn-back" (click)="goBack()">Back to List</button>
      </div>

      <div *ngIf="candidate && !loading">
        <div class="detail-header">
          <button class="btn-back" (click)="goBack()">&larr; Back to Candidates</button>
          <div class="header-actions">
            <button class="btn-edit" (click)="editCandidate()">Edit</button>
            <div class="advance-status-wrapper">
              <button class="btn-advance" (click)="toggleStatusMenu()">
                Change Status &#9662;
              </button>
              <div class="status-dropdown" *ngIf="showStatusMenu">
                <button *ngFor="let status of allStatuses"
                        class="status-option"
                        [ngClass]="getStatusOptionClass(status)"
                        [class.active-status]="status === candidate.offerStatus"
                        [disabled]="status === candidate.offerStatus"
                        (click)="advanceToStatus(status)">
                  {{ getStatusLabel(status) }}
                  <span *ngIf="status === candidate.offerStatus" class="current-badge">current</span>
                </button>
              </div>
            </div>
            <button class="btn-convert" *ngIf="canConvert(candidate)" (click)="convertToTechnician()" [disabled]="isConverting">
              {{ isConverting ? 'Converting...' : 'Convert to Technician' }}
            </button>
            <button class="btn-delete" (click)="deleteCandidate()">Delete</button>
          </div>
        </div>

        <div class="detail-card">
          <div class="detail-card-header">
            <h2>{{ candidate.techName }}</h2>
            <span class="status-chip" [ngClass]="getStatusClass(candidate.offerStatus)">
              {{ getStatusLabel(candidate.offerStatus) }}
            </span>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <h3>Contact Information</h3>
              <div class="detail-row">
                <span class="label">Email</span>
                <a [href]="'mailto:' + candidate.techEmail">{{ candidate.techEmail }}</a>
              </div>
              <div class="detail-row">
                <span class="label">Phone</span>
                <a [href]="'tel:' + candidate.techPhone">{{ candidate.techPhone }}</a>
              </div>
              <div class="detail-row">
                <span class="label">Home Address</span>
                <span>{{ candidate.homeAddress || '—' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Home State</span>
                <span>{{ candidate.homeState || extractState(candidate.homeAddress) || '—' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Work Site</span>
                <span>{{ candidate.workSite }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h3>Onboarding Details</h3>
              <div class="detail-row">
                <span class="label">Referred By</span>
                <span>{{ candidate.referredBy || '—' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Start Date</span>
                <span>{{ candidate.startDate | date:'mediumDate' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Vest Size</span>
                <span>{{ candidate.vestSize }}</span>
              </div>
            </div>
          </div>

          <div class="certs-section">
            <h3>Certifications & Screening</h3>
            <div class="certs-grid">
              <div class="cert-item" [class.complete]="candidate.drugTestComplete" [class.incomplete]="!candidate.drugTestComplete">
                <span class="cert-icon">{{ candidate.drugTestComplete ? '\u2714' : '\u2014' }}</span>
                <span class="cert-label">Drug Test</span>
              </div>
              <div class="cert-item" [class.complete]="candidate.oshaCertified" [class.incomplete]="!candidate.oshaCertified">
                <span class="cert-icon">{{ candidate.oshaCertified ? '\u2714' : '\u2014' }}</span>
                <span class="cert-label">OSHA Certified</span>
              </div>
              <div class="cert-item" [class.complete]="candidate.scissorLiftCertified" [class.incomplete]="!candidate.scissorLiftCertified">
                <span class="cert-icon">{{ candidate.scissorLiftCertified ? '\u2714' : '\u2014' }}</span>
                <span class="cert-label">Scissor Lift</span>
              </div>
            </div>
          </div>

          <!-- Resume & Headshot Section -->
          <div class="files-section">
            <h3>Resume & Headshot</h3>
            <div class="files-grid">
              <div class="file-item">
                <span class="file-label">Resume</span>
                <a *ngIf="candidate.resumeUrl" [href]="candidate.resumeUrl" target="_blank" class="file-link">
                  <span class="file-icon">&#128196;</span> Download Resume
                </a>
                <span *ngIf="!candidate.resumeUrl" class="file-empty">No resume uploaded</span>
              </div>
              <div class="file-item headshot-item">
                <span class="file-label">Headshot</span>
                <img *ngIf="candidate.headshotUrl" [src]="candidate.headshotUrl" alt="Candidate headshot" class="headshot-thumbnail" />
                <span *ngIf="!candidate.headshotUrl" class="file-empty">No headshot uploaded</span>
              </div>
            </div>
          </div>

          <!-- Notes Section (inline editable) -->
          <div class="notes-section">
            <div class="notes-header">
              <h3>Notes</h3>
              <button *ngIf="!isEditingNotes" class="btn-notes-action" (click)="startEditingNotes()">
                {{ candidate.notes ? 'Edit' : 'Add Note' }}
              </button>
            </div>
            <div *ngIf="!isEditingNotes" class="notes-display">
              <p *ngIf="candidate.notes" class="notes-text">{{ candidate.notes }}</p>
              <p *ngIf="!candidate.notes" class="notes-empty">No notes added yet. Click "Add Note" to get started.</p>
            </div>
            <div *ngIf="isEditingNotes" class="notes-edit">
              <textarea
                class="notes-textarea"
                [(ngModel)]="editedNotes"
                placeholder="Enter notes about this candidate..."
                rows="4"
              ></textarea>
              <div class="notes-actions">
                <button class="btn-notes-save" (click)="saveNotes()" [disabled]="isSavingNotes">
                  {{ isSavingNotes ? 'Saving...' : 'Save' }}
                </button>
                <button class="btn-notes-cancel" (click)="cancelEditingNotes()" [disabled]="isSavingNotes">Cancel</button>
              </div>
            </div>
          </div>

          <div class="meta-section">
            <span class="meta-item">Created: {{ candidate.createdAt | date:'medium' }}</span>
            <span class="meta-item">Updated: {{ candidate.updatedAt | date:'medium' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .candidate-detail-container {
      padding: 1.5rem;
      background-color: #f5f7fa;
      min-height: 100%;
    }

    .loading-state, .not-found-state {
      text-align: center;
      padding: 3rem;
      color: #616161;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-back {
      padding: 0.5rem 1rem;
      background: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-back:hover { background: rgba(25, 118, 210, 0.04); }

    .btn-edit {
      padding: 0.5rem 1.25rem;
      background: #1976d2;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-edit:hover { background: #1565c0; }

    .btn-advance {
      padding: 0.5rem 1.25rem;
      background: #388e3c;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-advance:hover { background: #2e7d32; }

    .advance-status-wrapper {
      position: relative;
      display: inline-block;
    }

    .status-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 100;
      margin-top: 4px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 200px;
      overflow: hidden;
    }

    .status-option {
      display: block;
      width: 100%;
      padding: 0.625rem 1rem;
      background: none;
      border: none;
      border-bottom: 1px solid #f5f5f5;
      text-align: left;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .status-option:last-child { border-bottom: none; }
    .status-option:hover:not(:disabled) { background: #f5f5f5; }
    .status-option:disabled { cursor: default; opacity: 0.7; }
    .status-option.active-status { background: #f5f5f5; font-weight: 600; }
    .status-option.no-transitions { color: #9e9e9e; cursor: default; font-style: italic; }
    .status-option.no-transitions:hover { background: none; }
    .status-option.option-do-not-hire { color: #c62828; }
    .status-option.option-do-not-hire:hover { background: #ffebee; }
    .status-option.option-turned-down-hold { color: #6d4c41; }
    .status-option.option-turned-down-hold:hover { background: #efebe9; }

    .current-badge {
      margin-left: 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      color: #9e9e9e;
      text-transform: uppercase;
    }

    .btn-convert {
      padding: 0.5rem 1.25rem;
      background: #7b1fa2;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-convert:hover:not(:disabled) { background: #6a1b9a; }
    .btn-convert:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-delete {
      padding: 0.5rem 1.25rem;
      background: #c62828;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-delete:hover { background: #b71c1c; }

    .detail-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .detail-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .detail-card-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #212121;
    }

    .status-chip {
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-chip.status-needs-review { background: #e3f2fd; color: #1565c0; }
    .status-chip.status-vetted-available { background: #e8f5e9; color: #2e7d32; }
    .status-chip.status-offer-extended { background: #fff3e0; color: #e65100; }
    .status-chip.status-offer-accepted { background: #f3e5f5; color: #6a1b9a; }
    .status-chip.status-hired-assigned { background: #e8f5e9; color: #1b5e20; }
    .status-chip.status-do-not-hire { background: #ffebee; color: #c62828; }
    .status-chip.status-turned-down-hold { background: #efebe9; color: #4e342e; }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 1.5rem;
    }

    .detail-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #616161;
      letter-spacing: 0.5px;
      margin: 0 0 0.75rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f5f5f5;
    }

    .detail-row .label {
      font-size: 0.875rem;
      color: #616161;
    }

    .detail-row a {
      color: #1976d2;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .detail-row a:hover { text-decoration: underline; }

    .detail-row span:not(.label) {
      font-size: 0.875rem;
      color: #212121;
      font-weight: 500;
    }

    .certs-section {
      margin-bottom: 1.5rem;
    }

    .certs-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #616161;
      letter-spacing: 0.5px;
      margin: 0 0 0.75rem;
    }

    .certs-grid {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .cert-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .cert-item.complete {
      background: #e8f5e9;
      border-color: #a5d6a7;
    }

    .cert-item.incomplete {
      background: #ffebee;
      border-color: #ef9a9a;
    }

    .cert-icon {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .cert-item.complete .cert-icon { color: #2e7d32; }
    .cert-item.incomplete .cert-icon { color: #c62828; }

    .cert-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #424242;
    }

    .meta-section {
      display: flex;
      gap: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .meta-item {
      font-size: 0.75rem;
      color: #9e9e9e;
    }

    /* --- Files (Resume & Headshot) Section --- */

    .files-section {
      margin-bottom: 1.5rem;
    }

    .files-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #616161;
      letter-spacing: 0.5px;
      margin: 0 0 0.75rem;
    }

    .files-grid {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .file-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .file-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #424242;
    }

    .file-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: #1976d2;
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid #bbdefb;
      border-radius: 4px;
      background: #e3f2fd;
      transition: background 0.15s;
    }

    .file-link:hover {
      background: #bbdefb;
      text-decoration: none;
    }

    .file-icon {
      font-size: 1rem;
    }

    .file-empty {
      font-size: 0.8125rem;
      color: #9e9e9e;
      font-style: italic;
    }

    .headshot-thumbnail {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 50%;
      border: 2px solid #e0e0e0;
    }

    /* --- Notes Section --- */

    .notes-section {
      margin-bottom: 1.5rem;
    }

    .notes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .notes-header h3 {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #616161;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .btn-notes-action {
      padding: 0.25rem 0.75rem;
      background: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-notes-action:hover {
      background: rgba(25, 118, 210, 0.04);
    }

    .notes-display {
      padding: 0.75rem;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      min-height: 3rem;
    }

    .notes-text {
      margin: 0;
      font-size: 0.875rem;
      color: #212121;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .notes-empty {
      margin: 0;
      font-size: 0.8125rem;
      color: #9e9e9e;
      font-style: italic;
    }

    .notes-edit {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .notes-textarea {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-family: inherit;
      border: 1px solid #1976d2;
      border-radius: 4px;
      resize: vertical;
      min-height: 100px;
      outline: none;
      box-sizing: border-box;
      line-height: 1.5;
    }

    .notes-textarea:focus {
      border-color: #1565c0;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15);
    }

    .notes-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn-notes-save {
      padding: 0.375rem 1rem;
      background: #1976d2;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-notes-save:hover:not(:disabled) { background: #1565c0; }
    .btn-notes-save:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-notes-cancel {
      padding: 0.375rem 1rem;
      background: transparent;
      color: #616161;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-notes-cancel:hover:not(:disabled) { background: #f5f5f5; }
    .btn-notes-cancel:disabled { opacity: 0.6; cursor: not-allowed; }

    @media (max-width: 768px) {
      .detail-grid { grid-template-columns: 1fr; }
      .detail-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
      .files-grid { flex-direction: column; }
    }
  `]
})
export class CandidateDetailComponent implements OnInit {
  candidate: Candidate | null = null;
  loading = false;
  isConverting = false;
  candidateId = '';
  showStatusMenu = false;

  allStatuses: OfferStatus[] = [
    'needs_review', 'vetted_available', 'offer_extended',
    'offer_accepted_onboarding', 'hired_assigned',
    'do_not_hire', 'turned_down_hold'
  ];

  // Notes inline editing state
  isEditingNotes = false;
  isSavingNotes = false;
  editedNotes = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private onboardingService: OnboardingService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.advance-status-wrapper')) {
      this.showStatusMenu = false;
    }
  }

  ngOnInit(): void {
    this.candidateId = this.route.snapshot.paramMap.get('candidateId') || '';
    this.loadCandidate();
  }

  loadCandidate(): void {
    this.loading = true;
    this.onboardingService.getCandidateById(this.candidateId).subscribe({
      next: (candidate) => {
        this.candidate = candidate;
        this.loading = false;
      },
      error: () => {
        this.candidate = null;
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  editCandidate(): void {
    const dialogRef = this.dialog.open(AddCandidateModalComponent, {
      width: '780px',
      maxWidth: '90vw',
      disableClose: true,
      data: { candidate: this.candidate }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const payload = {
          techName: `${result.basicInfo.firstName} ${result.basicInfo.lastName}`,
          middleName: result.basicInfo.middleName,
          techEmail: result.basicInfo.email,
          techPhone: result.basicInfo.phone,
          vestSize: result.basicInfo.vestSize,
          workSite: result.basicInfo.workSite,
          homeAddress: result.basicInfo.homeAddress,
          startDate: result.basicInfo.startDate,
          offerStatus: result.basicInfo.offerStatus,
          referredBy: result.basicInfo.referredBy || undefined,
          backgroundCheckComplete: result.coreQualifications.backgroundCheckComplete,
          drugTestComplete: result.coreQualifications.drugScreenComplete,
          oshaCertified: result.coreQualifications.oshaCertification,
          scissorLiftCertified: result.coreQualifications.liftCertification,
          attBadge: result.badgesAccess.attBadge,
          lumenBadge: result.badgesAccess.lumenBadge,
          attSupplierTraining: result.badgesAccess.attSupplierTraining,
          cienaBasicTraining: result.badgesAccess.cienaBasicTraining,
          googleRedBadge: result.badgesAccess.googleRedBadge,
          googleLdap: result.badgesAccess.googleLdap,
          metaGreenListing: result.badgesAccess.metaGreenListing,
          obsTraining: result.trainingCerts.obsTraining,
          osha10: result.trainingCerts.osha10,
          osha30: result.trainingCerts.osha30,
          techHandTools: result.trainingCerts.techHandTools,
          ciKitAssigned: result.equipmentKits.ciKitAssigned,
          fiberKitAssigned: result.equipmentKits.fiberKitAssigned,
          labelingKitAssigned: result.equipmentKits.labelingKitAssigned,
          powerKitAssigned: result.equipmentKits.powerKitAssigned,
          testingEqptAssigned: result.equipmentKits.testingEquipmentAssigned
        };
        this.onboardingService.updateCandidate(this.candidateId, payload).subscribe({
          next: () => {
            this.uploadCandidateFiles(this.candidateId, result.files, () => this.loadCandidate());
          },
          error: () => {
            alert('Failed to update candidate. Please try again.');
          }
        });
      }
    });
  }

  advanceToStatus(status: OfferStatus): void {
    if (!this.candidate) return;
    this.showStatusMenu = false;
    this.onboardingService.updateCandidate(this.candidateId, { offerStatus: status }).subscribe({
      next: () => this.loadCandidate(),
      error: () => {
        alert('Failed to update status. Please try again.');
      }
    });
  }

  toggleStatusMenu(): void {
    this.showStatusMenu = !this.showStatusMenu;
  }

  getAvailableTransitions(): OfferStatus[] {
    if (!this.candidate) return [];
    return getValidTransitions(this.candidate.offerStatus);
  }

  getStatusOptionClass(status: OfferStatus): string {
    switch (status) {
      case 'do_not_hire': return 'option-do-not-hire';
      case 'turned_down_hold': return 'option-turned-down-hold';
      default: return '';
    }
  }

  getStatusLabel(status: OfferStatus): string {
    return STATUS_LABELS[status] || status;
  }

  getStatusClass(status: OfferStatus): string {
    switch (status) {
      case 'needs_review': return 'status-needs-review';
      case 'vetted_available': return 'status-vetted-available';
      case 'offer_extended': return 'status-offer-extended';
      case 'offer_accepted_onboarding': return 'status-offer-accepted';
      case 'hired_assigned': return 'status-hired-assigned';
      case 'do_not_hire': return 'status-do-not-hire';
      case 'turned_down_hold': return 'status-turned-down-hold';
      default: return '';
    }
  }

  extractState(address: string | undefined): string {
    if (!address) return '';
    const match = address.match(/,\s*([A-Z]{2})[\s.]*(\d{5})?[.\s]*$/);
    return match ? match[1] : '';
  }

  canConvert(candidate: Candidate): boolean {
    return (candidate.offerStatus === 'offer_accepted_onboarding' || candidate.offerStatus === 'hired_assigned') &&
           candidate.drugTestComplete &&
           candidate.oshaCertified;
  }

  convertToTechnician(): void {
    if (!this.candidate || this.isConverting) return;

    const confirmed = window.confirm(
      `Convert ${this.candidate.techName} to a Technician? This will create a new technician record.`
    );
    if (!confirmed) return;

    this.isConverting = true;
    this.onboardingService.convertToTechnician(this.candidateId).subscribe({
      next: (result) => {
        this.isConverting = false;
        // Navigate to the new technician's detail page
        this.router.navigate(['/field-resource-management/onboarding/credentials', result.technicianId]);
      },
      error: () => {
        this.isConverting = false;
        alert('Failed to convert candidate to technician. Please try again.');
      }
    });
  }

  deleteCandidate(): void {
    if (!this.candidate) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${this.candidate.techName}? This cannot be undone.`
    );
    if (!confirmed) return;

    this.onboardingService.deleteCandidateById(this.candidateId).subscribe({
      next: () => {
        this.goBack();
      },
      error: () => {
        alert('Failed to delete candidate. Please try again.');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Notes inline editing
  // ---------------------------------------------------------------------------

  startEditingNotes(): void {
    this.editedNotes = this.candidate?.notes || '';
    this.isEditingNotes = true;
  }

  cancelEditingNotes(): void {
    this.isEditingNotes = false;
    this.editedNotes = '';
  }

  saveNotes(): void {
    if (this.isSavingNotes) return;
    this.isSavingNotes = true;

    this.onboardingService.updateCandidate(this.candidateId, { notes: this.editedNotes }).subscribe({
      next: () => {
        this.isSavingNotes = false;
        this.isEditingNotes = false;
        this.loadCandidate();
      },
      error: () => {
        this.isSavingNotes = false;
        alert('Failed to save notes. Please try again.');
      }
    });
  }

  private uploadCandidateFiles(candidateId: string, files: { resume?: File | null; headshot?: File | null }, reloadFn: () => void): void {
    const uploads: Observable<any>[] = [];
    if (files?.resume) {
      uploads.push(this.onboardingService.uploadResume(candidateId, files.resume));
    }
    if (files?.headshot) {
      uploads.push(this.onboardingService.uploadHeadshot(candidateId, files.headshot));
    }
    if (uploads.length > 0) {
      forkJoin(uploads).subscribe({
        next: () => reloadFn(),
        error: () => {
          alert('Candidate saved, but one or more file uploads failed. Please try re-uploading.');
          reloadFn();
        }
      });
    } else {
      reloadFn();
    }
  }

  private getDummyCandidate(): Candidate | null {
    const dummies: Record<string, Candidate> = {
      'cand-001': { candidateId: 'cand-001', techName: 'Marcus Rivera', techEmail: 'marcus.rivera@fieldops.com', techPhone: '214-555-2001', vestSize: 'L', backgroundCheckComplete: true, drugTestComplete: true, oshaCertified: true, scissorLiftCertified: true, workSite: 'Dallas HQ', homeState: 'TX', startDate: '2026-06-01', offerStatus: 'offer_accepted_onboarding', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-002': { candidateId: 'cand-002', techName: 'Priya Patel', techEmail: 'priya.patel@fieldops.com', techPhone: '214-555-2002', vestSize: 'S', backgroundCheckComplete: true, drugTestComplete: true, oshaCertified: true, scissorLiftCertified: false, workSite: 'Plano Tech Center', homeState: 'CA', startDate: '2026-06-10', offerStatus: 'offer_extended', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-003': { candidateId: 'cand-003', techName: 'James O\'Connor', techEmail: 'james.oconnor@fieldops.com', techPhone: '972-555-2003', vestSize: 'XL', backgroundCheckComplete: true, drugTestComplete: false, oshaCertified: true, scissorLiftCertified: true, workSite: 'Irving Business Park', homeState: 'FL', startDate: '2026-05-20', offerStatus: 'offer_accepted_onboarding', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-004': { candidateId: 'cand-004', techName: 'Aisha Johnson', techEmail: 'aisha.johnson@fieldops.com', techPhone: '469-555-2004', vestSize: 'M', backgroundCheckComplete: false, drugTestComplete: true, oshaCertified: false, scissorLiftCertified: false, workSite: 'Fort Worth DC', homeState: 'NY', startDate: '2026-07-01', offerStatus: 'needs_review', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-005': { candidateId: 'cand-005', techName: 'Carlos Mendez', techEmail: 'carlos.mendez@fieldops.com', techPhone: '214-555-2005', vestSize: 'L', backgroundCheckComplete: true, drugTestComplete: true, oshaCertified: true, scissorLiftCertified: true, workSite: 'McKinney Site A', homeState: 'GA', startDate: '2026-06-15', offerStatus: 'vetted_available', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-006': { candidateId: 'cand-006', techName: 'Sarah Kim', techEmail: 'sarah.kim@fieldops.com', techPhone: '972-555-2006', vestSize: 'S', backgroundCheckComplete: false, drugTestComplete: false, oshaCertified: true, scissorLiftCertified: true, workSite: 'Richardson Data Center', homeState: 'CO', startDate: '2026-06-20', offerStatus: 'needs_review', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() }
    };
    return dummies[this.candidateId] || null;
  }
}
