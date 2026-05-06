import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-candidate-list',
  templateUrl: './candidate-list.component.html',
  styleUrls: ['./candidate-list.component.scss']
})
export class CandidateListComponent implements OnInit {
  candidates: any[] = [
    { id: '1', name: 'John Smith', email: 'j.smith@email.com', status: 'Onboarding', startDate: new Date('2026-05-15') },
    { id: '2', name: 'Maria Garcia', email: 'm.garcia@email.com', status: 'Offer', startDate: new Date('2026-06-01') }
  ];
  filteredCandidates: any[] = [];
  searchTerm = '';
  displayedColumns = ['name', 'email', 'status', 'startDate', 'actions'];

  constructor(private router: Router) {}

  ngOnInit(): void { this.filteredCandidates = [...this.candidates]; }

  applyFilter(): void {
    const t = this.searchTerm.toLowerCase();
    this.filteredCandidates = this.candidates.filter(c => c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t));
  }

  viewCandidate(id: string): void { this.router.navigate(['/field-resource-management/onboarding/candidates', id]); }
  addCandidate(): void { this.router.navigate(['/field-resource-management/onboarding/candidates/new']); }
  getStatusColor(status: string): string {
    return ({ Applied: '', Screening: 'accent', Offer: 'accent', 'Pre-Employment': 'accent', Onboarding: 'primary', Active: 'primary' } as any)[status] || '';
  }
}
