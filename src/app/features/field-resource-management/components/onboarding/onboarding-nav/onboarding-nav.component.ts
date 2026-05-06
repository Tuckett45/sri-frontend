import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-onboarding-nav',
  templateUrl: './onboarding-nav.component.html',
  styleUrls: ['./onboarding-nav.component.scss']
})
export class OnboardingNavComponent {
  navLinks = [
    { label: 'Pipeline', path: 'pipeline', icon: 'view_kanban' },
    { label: 'Candidates', path: 'candidates', icon: 'people' },
    { label: 'Credentials', path: 'credentials', icon: 'verified' },
    { label: 'Onboarding Checklist', path: 'checklist', icon: 'checklist' }
  ];

  constructor(private router: Router) {}
}
