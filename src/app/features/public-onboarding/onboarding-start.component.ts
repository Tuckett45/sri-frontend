import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PublicOnboardingService } from './public-onboarding.service';

@Component({
  selector: 'app-onboarding-start',
  template: `
    <div class="onboarding-start-container">
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Preparing your form...</p>
      </div>

      <div *ngIf="error" class="error-state">
        <p>Something went wrong. Please try again or contact your recruiter.</p>
        <button (click)="startOnboarding()" [disabled]="retryDisabled">Try Again</button>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-start-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      text-align: center;
    }
    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e0e0e0;
      border-top: 4px solid #1976d2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error-state p {
      color: #d32f2f;
      font-size: 16px;
    }
    .error-state button {
      padding: 10px 24px;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .error-state button:hover {
      background-color: #1565c0;
    }
    .error-state button:disabled {
      background-color: #9e9e9e;
      cursor: not-allowed;
    }
  `]
})
export class OnboardingStartComponent implements OnInit {
  loading = false;
  error = false;
  retryDisabled = false;

  constructor(
    private publicOnboardingService: PublicOnboardingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startOnboarding();
  }

  startOnboarding(): void {
    this.loading = true;
    this.error = false;
    this.publicOnboardingService.startSession().subscribe({
      next: (res) => {
        this.router.navigate(['/onboarding/apply', res.token]);
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.retryDisabled = true;
        setTimeout(() => {
          this.retryDisabled = false;
        }, 3000);
      }
    });
  }
}
