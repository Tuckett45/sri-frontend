import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-credential-detail',
  templateUrl: './credential-detail.component.html',
  styleUrls: ['./credential-detail.component.scss']
})
export class CredentialDetailComponent implements OnInit {
  credential: any = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    // Mock data lookup
    this.credential = {
      id,
      name: 'BICSI Installer 2',
      issuingOrganization: 'BICSI',
      issueDate: new Date('2023-03-01'),
      expirationDate: new Date('2027-03-01'),
      credentialNumber: 'BICSI-2023-7829',
      notes: 'Renewed March 2023. Next renewal due March 2027.',
      documentUrl: null,
      status: 'Active'
    };
  }

  goBack(): void { this.router.navigate(['/field-resource-management/onboarding/credentials']); }
  edit(): void { this.router.navigate(['/field-resource-management/onboarding/credentials', this.credential.id, 'edit']); }
}
