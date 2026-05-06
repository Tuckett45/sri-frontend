import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-quote-workflow',
  templateUrl: './quote-workflow.component.html',
  styleUrls: ['./quote-workflow.component.scss']
})
export class QuoteWorkflowComponent implements OnInit {
  quoteId = '';
  quote: any = null;
  activeStep = 0;
  steps = ['RFP Intake', 'Labor Estimate', 'BOM', 'BOM Review', 'Assembly', 'Delivery', 'Convert'];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.quoteId = this.route.snapshot.params['id'];
    this.quote = { id: this.quoteId, clientName: 'Client', projectTitle: 'Project', status: 'Draft' };
  }

  goBack(): void { this.router.navigate(['/field-resource-management/quotes']); }
}
