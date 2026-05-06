import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-credentials-list',
  templateUrl: './credentials-list.component.html',
  styleUrls: ['./credentials-list.component.scss']
})
export class CredentialsListComponent implements OnInit {
  @Input() technicianId = '';

  credentials: any[] = [
    { id: '1', name: 'BICSI Installer 2', issuer: 'BICSI', issueDate: new Date('2023-03-01'), expirationDate: new Date('2027-03-01'), status: 'Active' },
    { id: '2', name: 'OSHA 30', issuer: 'OSHA', issueDate: new Date('2022-07-15'), expirationDate: new Date('2027-07-15'), status: 'Active' },
    { id: '3', name: 'CompTIA Network+', issuer: 'CompTIA', issueDate: new Date('2021-01-10'), expirationDate: new Date('2024-01-10'), status: 'Expired' }
  ];
  displayedColumns = ['name', 'issuer', 'issueDate', 'expirationDate', 'status', 'actions'];

  constructor(private router: Router) {}
  ngOnInit(): void {}

  addCredential(): void { this.router.navigate(['/field-resource-management/onboarding/credentials/new']); }
  viewCredential(id: string): void { this.router.navigate(['/field-resource-management/onboarding/credentials', id]); }
  getStatusColor(status: string): string { return status === 'Active' ? 'primary' : status === 'Expired' ? 'warn' : 'accent'; }
}
