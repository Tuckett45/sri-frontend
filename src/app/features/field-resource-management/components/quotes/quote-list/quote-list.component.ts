import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-quote-list',
  templateUrl: './quote-list.component.html',
  styleUrls: ['./quote-list.component.scss']
})
export class QuoteListComponent implements OnInit, OnDestroy {
  quotes: any[] = [
    { id: '1', clientName: 'ABC Corp', projectTitle: 'Network Upgrade', status: 'Draft', createdDate: new Date(), value: 45000 },
    { id: '2', clientName: 'XYZ Inc', projectTitle: 'Security Install', status: 'Submitted', createdDate: new Date(), value: 28500 }
  ];
  filteredQuotes: any[] = [];
  searchTerm = '';
  displayedColumns = ['clientName', 'projectTitle', 'status', 'value', 'createdDate', 'actions'];
  quoteStatuses = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Converted'];
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void { this.filteredQuotes = [...this.quotes]; }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredQuotes = this.quotes.filter(q =>
      q.clientName.toLowerCase().includes(term) || q.projectTitle.toLowerCase().includes(term)
    );
  }

  viewQuote(id: string): void { this.router.navigate(['/field-resource-management/quotes', id]); }
  newQuote(): void { this.router.navigate(['/field-resource-management/quotes/new']); }
  getStatusColor(status: string): string {
    return ({ Draft: '', Submitted: 'accent', 'Under Review': 'accent', Approved: 'primary', Rejected: 'warn', Converted: 'primary' } as any)[status] || '';
  }
}
