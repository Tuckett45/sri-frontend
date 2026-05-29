import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { OnboardingLinkService, OnboardingLinkResponse } from '../../../services/onboarding-link.service';
import { environment } from '../../../../../../environments/environments';

@Component({
  selector: 'app-generate-link-dialog',
  template: `
    <h2 mat-dialog-title>Generate Onboarding Link</h2>

    <mat-dialog-content>
      <!-- Generate Form -->
      <div class="generate-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes (optional)</mat-label>
          <input matInput [(ngModel)]="notes" placeholder="e.g. For John Smith interview" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Expires In</mat-label>
          <mat-select [(ngModel)]="expiresInHours">
            <mat-option [value]="24">24 hours</mat-option>
            <mat-option [value]="48">48 hours</mat-option>
            <mat-option [value]="72">72 hours</mat-option>
            <mat-option [value]="168">7 days</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-raised-button color="primary" (click)="onGenerate()" [disabled]="generating">
          {{ generating ? 'Generating...' : 'Generate Link' }}
        </button>
      </div>

      <!-- Generated Link Display -->
      <div class="generated-link-section" *ngIf="generatedUrl">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Onboarding Link</mat-label>
          <input matInput [value]="generatedUrl" readonly />
        </mat-form-field>
        <button mat-stroked-button color="accent" (click)="onCopyLink()">
          {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
        </button>
      </div>

      <!-- Error -->
      <div class="error-message" *ngIf="errorMessage">
        {{ errorMessage }}
      </div>

      <!-- Existing Links Table -->
      <h3 *ngIf="existingLinks.length > 0">Existing Links</h3>
      <div class="links-table-wrapper" *ngIf="existingLinks.length > 0">
        <table class="links-table">
          <thead>
            <tr>
              <th>Notes</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let link of existingLinks">
              <td>{{ link.notes || '-' }}</td>
              <td>{{ link.createdAt | date:'short' }}</td>
              <td>{{ link.expiresAt | date:'short' }}</td>
              <td>
                <span class="status-chip" [ngClass]="'status-' + link.status">{{ link.status }}</span>
              </td>
              <td>
                <button mat-icon-button
                        color="warn"
                        (click)="onRevoke(link)"
                        [disabled]="link.status !== 'active'"
                        matTooltip="Revoke this link">
                  <mat-icon>block</mat-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="loadingLinks" class="loading-text">Loading existing links...</div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .generate-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .full-width {
      width: 100%;
    }

    .generated-link-section {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #e8f5e9;
      border-radius: 4px;
    }

    .error-message {
      color: #c62828;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .links-table-wrapper {
      max-height: 240px;
      overflow-y: auto;
      margin-bottom: 1rem;
    }

    .links-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .links-table th,
    .links-table td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    .links-table th {
      background: #f5f5f5;
      font-weight: 600;
    }

    .status-chip {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-active {
      background: #c8e6c9;
      color: #2e7d32;
    }

    .status-expired {
      background: #fff9c4;
      color: #f57f17;
    }

    .status-used {
      background: #e3f2fd;
      color: #1565c0;
    }

    .status-revoked {
      background: #ffcdd2;
      color: #c62828;
    }

    .loading-text {
      text-align: center;
      padding: 1rem;
      color: #757575;
      font-size: 0.875rem;
    }

    h3 {
      margin: 1rem 0 0.5rem;
      font-size: 1rem;
      font-weight: 600;
    }
  `]
})
export class GenerateLinkDialogComponent implements OnInit {
  notes = '';
  expiresInHours = 48;
  generating = false;
  generatedUrl = '';
  copied = false;
  errorMessage = '';

  existingLinks: OnboardingLinkResponse[] = [];
  loadingLinks = false;

  constructor(
    private dialogRef: MatDialogRef<GenerateLinkDialogComponent>,
    private onboardingLinkService: OnboardingLinkService
  ) {}

  ngOnInit(): void {
    this.loadExistingLinks();
  }

  onGenerate(): void {
    this.generating = true;
    this.errorMessage = '';
    this.generatedUrl = '';
    this.copied = false;

    this.onboardingLinkService.generateLink(this.notes || undefined, this.expiresInHours).subscribe({
      next: (response) => {
        this.generating = false;
        this.generatedUrl = `${environment.appUrl}/onboarding/apply/${response.token}`;
        this.loadExistingLinks();
      },
      error: (err) => {
        this.generating = false;
        this.errorMessage = err?.message || 'Failed to generate link. Please try again.';
      }
    });
  }

  onCopyLink(): void {
    navigator.clipboard.writeText(this.generatedUrl).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 3000);
    });
  }

  onRevoke(link: OnboardingLinkResponse): void {
    this.onboardingLinkService.revokeLink(link.id).subscribe({
      next: () => {
        this.loadExistingLinks();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to revoke link.';
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private loadExistingLinks(): void {
    this.loadingLinks = true;
    this.onboardingLinkService.getLinks().subscribe({
      next: (links) => {
        this.existingLinks = links;
        this.loadingLinks = false;
      },
      error: () => {
        this.loadingLinks = false;
      }
    });
  }
}
