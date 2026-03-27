import { Component } from '@angular/core';

interface OnboardingNavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-onboarding-nav',
  template: `
    <div class="onboarding-nav-container">
      <nav class="onboarding-nav" aria-label="Onboarding Navigation">
        <ul class="onboarding-nav-links">
          <li *ngFor="let link of navLinks">
            <a
              [routerLink]="link.route"
              routerLinkActive="active"
              class="onboarding-nav-link">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </nav>
      <div class="onboarding-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-nav-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: #f5f7fa;
    }

    .onboarding-nav {
      background: #ffffff;
      border-bottom: 1px solid #e0e0e0;
      padding: 0 1.5rem;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }

    .onboarding-nav-links {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0;
    }

    .onboarding-nav-link {
      display: inline-flex;
      align-items: center;
      padding: 0.875rem 1.25rem;
      text-decoration: none;
      color: #616161;
      font-size: 0.875rem;
      font-weight: 500;
      border-bottom: 3px solid transparent;
      transition: color 0.2s, border-color 0.2s, background-color 0.2s;
    }

    .onboarding-nav-link:hover {
      color: #1976d2;
      background-color: rgba(25, 118, 210, 0.04);
      border-bottom-color: #bbdefb;
    }

    .onboarding-nav-link.active {
      color: #1976d2;
      font-weight: 600;
      border-bottom-color: #1976d2;
    }

    .onboarding-content {
      flex: 1;
      padding: 0;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .onboarding-nav {
        padding: 0 0.75rem;
        overflow-x: auto;
      }

      .onboarding-nav-links {
        flex-wrap: nowrap;
      }

      .onboarding-nav-link {
        padding: 0.75rem 1rem;
        font-size: 0.8125rem;
        white-space: nowrap;
      }
    }
  `]
})
export class OnboardingNavComponent {
  navLinks: OnboardingNavLink[] = [
    { label: 'Candidate List', route: './candidates' },
    { label: 'Pipeline Dashboard', route: './pipeline' }
  ];
}
