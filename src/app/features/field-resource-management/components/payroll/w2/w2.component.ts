import { Component } from '@angular/core';

export interface W2Document {
  id: string;
  employeeId: string;
  taxYear: number;
  documentUrl: string;
}

@Component({
  selector: 'app-w2',
  template: `
    <div class="w2">
      <h2>W-2 Documents</h2>
      <div class="employee-selector">
        <label for="employeeId">Select Employee</label>
        <input id="employeeId" [(ngModel)]="selectedEmployeeId" (ngModelChange)="filterDocuments()" placeholder="Enter Employee ID" />
      </div>
      <table *ngIf="filteredDocuments.length > 0">
        <thead>
          <tr>
            <th>Tax Year</th>
            <th>Document</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let doc of filteredDocuments">
            <td>{{ doc.taxYear }}</td>
            <td><a [href]="doc.documentUrl">View W-2</a></td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="selectedEmployeeId && filteredDocuments.length === 0">No W-2 documents found for this employee.</p>
    </div>
  `
})
export class W2Component {
  documents: W2Document[] = [];
  filteredDocuments: W2Document[] = [];
  selectedEmployeeId: string = '';

  filterDocuments(): void {
    if (this.selectedEmployeeId) {
      this.filteredDocuments = this.documents.filter(d => d.employeeId === this.selectedEmployeeId);
    } else {
      this.filteredDocuments = [];
    }
  }
}
