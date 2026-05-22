import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { OnboardingService } from '../../../services/onboarding.service';
import { Candidate, OfferStatus } from '../../../models/onboarding.models';
import { OnboardingInfoModalComponent } from '../onboarding-info-modal/onboarding-info-modal.component';
import { AddCandidateModalComponent } from '../add-candidate-modal/add-candidate-modal.component';

const STATUS_LABELS: Record<OfferStatus, string> = {
  needs_review: 'Needs Review',
  vetted_available: 'Vetted/Available',
  offer_extended: 'Offer Extended',
  offer_accepted_onboarding: 'Offer Accepted/Onboarding',
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
            <button class="btn-advance" *ngIf="candidate.offerStatus !== 'offer_accepted_onboarding'" (click)="advanceStatus()">
              Advance Status
            </button>
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
                <span class="label">Work Site</span>
                <span>{{ candidate.workSite }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h3>Onboarding Details</h3>
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

    @media (max-width: 768px) {
      .detail-grid { grid-template-columns: 1fr; }
      .detail-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
    }
  `]
})
export class CandidateDetailComponent implements OnInit {
  candidate: Candidate | null = null;
  loading = false;
  isConverting = false;
  candidateId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private onboardingService: OnboardingService
  ) {}

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
          drugTestComplete: result.coreQualifications.backgroundDrugScreen,
          oshaCertified: result.coreQualifications.oshaCertification,
          scissorLiftCertified: result.coreQualifications.liftCertification
        };
        this.onboardingService.updateCandidate(this.candidateId, payload).subscribe({
          next: () => this.loadCandidate(),
          error: () => {}
        });
      }
    });
  }

  advanceStatus(): void {
    if (!this.candidate) return;
    const nextStatus: Record<string, OfferStatus> = {
      'needs_review': 'vetted_available',
      'vetted_available': 'offer_extended',
      'offer_extended': 'offer_accepted_onboarding'
    };
    const next = nextStatus[this.candidate.offerStatus];
    if (next) {
      this.onboardingService.updateCandidate(this.candidateId, { offerStatus: next }).subscribe({
        next: () => this.loadCandidate(),
        error: () => {}
      });
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
      default: return '';
    }
  }

  canConvert(candidate: Candidate): boolean {
    return candidate.offerStatus === 'offer_accepted_onboarding' &&
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

  private getDummyCandidate(): Candidate | null {
    const dummies: Record<string, Candidate> = {
      'cand-001': { candidateId: 'cand-001', techName: 'Marcus Rivera', techEmail: 'marcus.rivera@fieldops.com', techPhone: '214-555-2001', vestSize: 'L', drugTestComplete: true, oshaCertified: true, scissorLiftCertified: true, workSite: 'Dallas HQ', startDate: '2026-06-01', offerStatus: 'offer_accepted_onboarding', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-002': { candidateId: 'cand-002', techName: 'Priya Patel', techEmail: 'priya.patel@fieldops.com', techPhone: '214-555-2002', vestSize: 'S', drugTestComplete: true, oshaCertified: true, scissorLiftCertified: false, workSite: 'Plano Tech Center', startDate: '2026-06-10', offerStatus: 'offer_extended', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-003': { candidateId: 'cand-003', techName: 'James O\'Connor', techEmail: 'james.oconnor@fieldops.com', techPhone: '972-555-2003', vestSize: 'XL', drugTestComplete: false, oshaCertified: true, scissorLiftCertified: true, workSite: 'Irving Business Park', startDate: '2026-05-20', offerStatus: 'offer_accepted_onboarding', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-004': { candidateId: 'cand-004', techName: 'Aisha Johnson', techEmail: 'aisha.johnson@fieldops.com', techPhone: '469-555-2004', vestSize: 'M', drugTestComplete: true, oshaCertified: false, scissorLiftCertified: false, workSite: 'Fort Worth DC', startDate: '2026-07-01', offerStatus: 'needs_review', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-005': { candidateId: 'cand-005', techName: 'Carlos Mendez', techEmail: 'carlos.mendez@fieldops.com', techPhone: '214-555-2005', vestSize: 'L', drugTestComplete: true, oshaCertified: true, scissorLiftCertified: true, workSite: 'McKinney Site A', startDate: '2026-06-15', offerStatus: 'vetted_available', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() },
      'cand-006': { candidateId: 'cand-006', techName: 'Sarah Kim', techEmail: 'sarah.kim@fieldops.com', techPhone: '972-555-2006', vestSize: 'S', drugTestComplete: false, oshaCertified: true, scissorLiftCertified: true, workSite: 'Richardson Data Center', startDate: '2026-06-20', offerStatus: 'needs_review', createdBy: 'system', createdAt: new Date().toISOString(), updatedBy: 'system', updatedAt: new Date().toISOString() }
    };
    return dummies[this.candidateId] || null;
  }
}
