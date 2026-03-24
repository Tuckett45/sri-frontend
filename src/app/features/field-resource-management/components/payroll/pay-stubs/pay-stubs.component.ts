import { Component } from '@angular/core';

export interface PayStub {
  id: string;
  employeeId: string;
  payPeriod: string;
  grossPay: number;
  netPay: number;
  date: Date;
}

@Component({
  selector: 'app-pay-stubs',
  template: `
    <div class="pay-stubs">
      <h2>Pay Stubs</h2>
      <div class="employee-selector">
        <label for="employeeId">Select Employee</label>
        <input id="employeeId" [(ngModel)]="selectedEmployeeId" (ngModelChange)="filterStubs()" placeholder="Enter Employee ID" />
      </div>
      <table *ngIf="filteredStubs.length > 0">
        <thead>
          <tr>
            <th>Pay Period</th>
            <th>Gross Pay</th>
            <th>Net Pay</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let stub of filteredStubs">
            <td>{{ stub.payPeriod }}</td>
            <td>{{ stub.grossPay | currency }}</td>
            <td>{{ stub.netPay | currency }}</td>
            <td>{{ stub.date | date:'short' }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="selectedEmployeeId && filteredStubs.length === 0">No pay stubs found for this employee.</p>
    </div>
  `
})
export class PayStubsComponent {
  payStubs: PayStub[] = [];
  filteredStubs: PayStub[] = [];
  selectedEmployeeId: string = '';

  filterStubs(): void {
    if (this.selectedEmployeeId) {
      this.filteredStubs = this.payStubs.filter(s => s.employeeId === this.selectedEmployeeId);
    } else {
      this.filteredStubs = [];
    }
  }
}
