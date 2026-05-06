import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-convert-to-job',
  templateUrl: './convert-to-job.component.html',
  styleUrls: ['./convert-to-job.component.scss']
})
export class ConvertToJobComponent {
  @Input() quote: any = { clientName: 'ABC Corp', projectTitle: 'Network Upgrade', value: 9180, status: 'Approved' };
  converting = false;

  constructor(private router: Router) {}

  convertToJob(): void {
    this.converting = true;
    // Navigate to new job setup, passing quote data via state
    this.router.navigate(['/field-resource-management/jobs/new'], {
      state: { fromQuote: this.quote }
    });
  }
}
