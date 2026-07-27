import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { OnboardingService } from '../../../services/onboarding.service';
import { Candidate, OfferStatus } from '../../../models/onboarding.models';

@Component({
  selector: 'app-pipeline-dashboard',
  template: `
    <div class="pipeline-dashboard-container">
      <h2>Pipeline Dashboard</h2>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage" role="alert">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''" aria-label="Dismiss error">Dismiss</button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-indicator">Loading pipeline data...</div>

      <ng-container *ngIf="!loading && !errorMessage">
        <!-- Summary Cards -->
        <div class="cards-grid">
          <div class="card clickable" tabindex="0" role="button"
               aria-label="View Pre Offer candidates"
               (click)="navigateToStatus('pre_offer')"
               (keydown.enter)="navigateToStatus('pre_offer')">
            <span class="card-count">{{ preOfferCount }}</span>
            <span class="card-label">Pre Offer</span>
          </div>
          <div class="card clickable" tabindex="0" role="button"
               aria-label="View Offer candidates"
               (click)="navigateToStatus('offer')"
               (keydown.enter)="navigateToStatus('offer')">
            <span class="card-count">{{ offerCount }}</span>
            <span class="card-label">Offer</span>
          </div>
          <div class="card clickable" tabindex="0" role="button"
               aria-label="View Offer Acceptance candidates"
               (click)="navigateToStatus('offer_acceptance')"
               (keydown.enter)="navigateToStatus('offer_acceptance')">
            <span class="card-count">{{ offerAcceptanceCount }}</span>
            <span class="card-label">Offer Acceptance</span>
          </div>
          <div class="card clickable" tabindex="0" role="button"
               aria-label="View candidates with incomplete certifications"
               (click)="navigateToIncompleteCerts()"
               (keydown.enter)="navigateToIncompleteCerts()">
            <span class="card-count warn">{{ incompleteCertsCount }}</span>
            <span class="card-label">Incomplete Certs</span>
          </div>
          <div class="card">
            <span class="card-count warn">{{ incompleteDrugTestCount }}</span>
            <span class="card-label">Incomplete Drug Test</span>
          </div>
          <div class="card">
            <span class="card-count">{{ startingWithin14DaysCount }}</span>
            <span class="card-label">Starting Within 14 Days</span>
          </div>
        </div>

        <!-- Pipeline Funnel + Upcoming Starts -->
        <div class="two-col">
          <section class="panel">
            <h3>Pipeline Funnel</h3>
            <div class="funnel">
              <div *ngFor="let stage of funnelStages"
                   [style.width.%]="stage.pct"
                   [class]="'funnel-bar ' + stage.cls"
                   [attr.aria-label]="stage.label + ': ' + stage.count">
                <span class="funnel-label">{{ stage.label }}</span>
                <span class="funnel-value">{{ stage.count }}</span>
              </div>
            </div>
          </section>

          <section class="panel">
            <h3>Upcoming Starts (Next 7 Days)</h3>
            <table class="mini-table" *ngIf="upcomingStarts.length > 0">
              <thead>
                <tr><th>Name</th><th>Work Site</th><th>Start Date</th><th>Ready</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of upcomingStarts" class="clickable-row" tabindex="0"
                    (click)="navigateToCandidate(c.candidateId)"
                    (keydown.enter)="navigateToCandidate(c.candidateId)">
                  <td>{{ c.techName }}</td>
                  <td>{{ c.workSite }}</td>
                  <td>{{ c.startDate }}</td>
                  <td class="ready-cell">
                    <span *ngIf="isReady(c)" class="badge ready">Ready</span>
                    <span *ngIf="!isReady(c)" class="badge not-ready">Not Ready</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="empty-state" *ngIf="upcomingStarts.length === 0">No candidates starting in the next 7 days.</p>
          </section>
        </div>

        <!-- Recent Candidates -->
        <section class="panel">
          <div class="panel-header">
            <h3>Recently Added Candidates</h3>
            <button type="button" class="link-btn" (click)="navigateToCandidateList()" aria-label="View all candidates">View All</button>
          </div>
          <table class="mini-table" *ngIf="recentCandidates.length > 0">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Work Site</th><th>Status</th><th>Drug Test</th><th>Certs</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of recentCandidates" class="clickable-row" tabindex="0"
                  (click)="navigateToCandidate(c.candidateId)"
                  (keydown.enter)="navigateToCandidate(c.candidateId)">
                <td>{{ c.techName }}</td>
                <td>{{ c.techEmail }}</td>
                <td>{{ c.workSite }}</td>
                <td>{{ statusLabel(c.offerStatus) }}</td>
                <td class="bool-cell">{{ c.drugTestComplete ? '✓' : '—' }}</td>
                <td class="bool-cell">{{ certsComplete(c) ? '✓' : certsFraction(c) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .pipeline-dashboard-container { margin: 1.5rem; padding: 1.5rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    h2 { margin: 0 0 1.25rem; font-size: 1.25rem; font-weight: 600; color: #212121; }
    h3 { margin: 0 0 0.75rem; font-size: 1rem; font-weight: 600; color: #212121; }

    .error-banner { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; margin-bottom: 1rem; background: #fdecea; border: 1px solid #f5c6cb; border-radius: 4px; color: #b71c1c; font-size: 0.875rem; }
    .error-banner button { background: none; border: none; color: #b71c1c; cursor: pointer; font-weight: 600; text-decoration: underline; }
    .loading-indicator { text-align: center; padding: 2rem; color: #757575; }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.25rem 0.75rem; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 8px; text-align: center; transition: box-shadow 0.15s, background-color 0.15s; }
    .card.clickable { cursor: pointer; }
    .card.clickable:hover { background: #e3f2fd; border-color: #90caf9; box-shadow: 0 2px 8px rgba(25,118,210,0.12); }
    .card.clickable:focus { outline: 2px solid #1976d2; outline-offset: 2px; }
    .card-count { font-size: 2rem; font-weight: 700; color: #1976d2; line-height: 1; margin-bottom: 0.5rem; }
    .card-count.warn { color: #e65100; }
    .card-label { font-size: 0.8125rem; font-weight: 500; color: #424242; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
    .panel { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .panel-header h3 { margin-bottom: 0; }

    .funnel { display: flex; flex-direction: column; gap: 0.5rem; }
    .funnel-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 1rem; border-radius: 6px; min-width: 80px; font-size: 0.875rem; font-weight: 500; color: #fff; transition: width 0.4s ease; }
    .stage-pre-offer { background: #42a5f5; }
    .stage-offer { background: #1976d2; }
    .stage-acceptance { background: #0d47a1; }
    .funnel-label { white-space: nowrap; }
    .funnel-value { font-weight: 700; }

    .mini-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .mini-table thead th { text-align: left; padding: 0.5rem 0.625rem; background: #eee; border-bottom: 2px solid #e0e0e0; font-weight: 600; color: #424242; white-space: nowrap; }
    .mini-table tbody td { padding: 0.5rem 0.625rem; border-bottom: 1px solid #e0e0e0; color: #212121; }
    .clickable-row { cursor: pointer; transition: background-color 0.15s; }
    .clickable-row:hover { background-color: rgba(25,118,210,0.04); }
    .clickable-row:focus { outline: 2px solid #1976d2; outline-offset: -2px; }
    .bool-cell { text-align: center; }

    .badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .badge.ready { background: #e8f5e9; color: #2e7d32; }
    .badge.not-ready { background: #fff3e0; color: #e65100; }

    .link-btn { background: none; border: none; color: #1976d2; cursor: pointer; font-size: 0.8125rem; font-weight: 500; text-decoration: underline; }
    .link-btn:hover { color: #0d47a1; }
    .empty-state { text-align: center; padding: 1.5rem; color: #757575; font-size: 0.875rem; }

    @media (max-width: 768px) {
      .pipeline-dashboard-container { margin: 1rem; padding: 1rem; }
      .cards-grid { grid-template-columns: repeat(2, 1fr); }
      .two-col { grid-template-columns: 1fr; }
    }
  `]
})
export class PipelineDashboardComponent implements OnInit {
  loading = false;
  errorMessage = '';

  preOfferCount = 0;
  offerCount = 0;
  offerAcceptanceCount = 0;
  incompleteCertsCount = 0;
  incompleteDrugTestCount = 0;
  startingWithin14DaysCount = 0;

  funnelStages: { label: string; count: number; pct: number; cls: string }[] = [];
  upcomingStarts: Candidate[] = [];
  recentCandidates: Candidate[] = [];

  private readonly STATUS_LABELS: Record<OfferStatus, string> = {
    pre_offer: 'Pre Offer',
    offer: 'Offer',
    offer_acceptance: 'Acceptance',
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void { this.loadCandidates(); }

  navigateToStatus(status: OfferStatus): void {
    this.router.navigate(['candidates'], { relativeTo: this.route.parent, queryParams: { offerStatus: status } });
  }

  navigateToIncompleteCerts(): void {
    this.router.navigate(['candidates'], { relativeTo: this.route.parent, queryParams: { incompleteCerts: 'true' } });
  }

  navigateToCandidate(id: string): void {
    this.router.navigate(['candidates', id], { relativeTo: this.route.parent });
  }

  navigateToCandidateList(): void {
    this.router.navigate(['candidates'], { relativeTo: this.route.parent });
  }

  statusLabel(status: OfferStatus): string { return this.STATUS_LABELS[status] ?? status; }

  isReady(c: Candidate): boolean {
    return c.drugTestComplete && c.oshaCertified && c.scissorLiftCertified && c.biisciCertified;
  }

  certsComplete(c: Candidate): boolean {
    return c.oshaCertified && c.scissorLiftCertified && c.biisciCertified;
  }

  certsFraction(c: Candidate): string {
    const done = [c.oshaCertified, c.scissorLiftCertified, c.biisciCertified].filter(Boolean).length;
    return done + '/3';
  }

  private loadCandidates(): void {
    this.loading = true;
    this.errorMessage = '';
    this.onboardingService.getCandidates().subscribe({
      next: (candidates) => {
        this.computeCounts(candidates);
        this.buildFunnel();
        this.buildUpcomingStarts(candidates);
        this.buildRecentCandidates(candidates);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Failed to load pipeline data.';
      },
    });
  }

  private computeCounts(candidates: Candidate[]): void {
    this.preOfferCount = candidates.filter(c => c.offerStatus === 'pre_offer').length;
    this.offerCount = candidates.filter(c => c.offerStatus === 'offer').length;
    this.offerAcceptanceCount = candidates.filter(c => c.offerStatus === 'offer_acceptance').length;
    this.incompleteCertsCount = candidates.filter(c => !c.oshaCertified || !c.scissorLiftCertified || !c.biisciCertified).length;
    this.incompleteDrugTestCount = candidates.filter(c => !c.drugTestComplete).length;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in14 = new Date(today); in14.setDate(in14.getDate() + 14);
    this.startingWithin14DaysCount = candidates.filter(c => {
      const s = new Date(c.startDate); s.setHours(0, 0, 0, 0);
      return s >= today && s <= in14;
    }).length;
  }

  private buildFunnel(): void {
    const total = this.preOfferCount + this.offerCount + this.offerAcceptanceCount;
    const pct = (n: number) => total > 0 ? Math.max(25, Math.round((n / total) * 100)) : 33;
    this.funnelStages = [
      { label: 'Pre Offer', count: this.preOfferCount, pct: pct(this.preOfferCount), cls: 'stage-pre-offer' },
      { label: 'Offer', count: this.offerCount, pct: pct(this.offerCount), cls: 'stage-offer' },
      { label: 'Acceptance', count: this.offerAcceptanceCount, pct: pct(this.offerAcceptanceCount), cls: 'stage-acceptance' },
    ];
  }

  private buildUpcomingStarts(candidates: Candidate[]): void {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
    this.upcomingStarts = candidates
      .filter(c => { const s = new Date(c.startDate); s.setHours(0, 0, 0, 0); return s >= today && s <= in7; })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  private buildRecentCandidates(candidates: Candidate[]): void {
    this.recentCandidates = [...candidates]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }
}
