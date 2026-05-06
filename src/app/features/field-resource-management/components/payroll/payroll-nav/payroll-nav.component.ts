import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-payroll-nav',
  templateUrl: './payroll-nav.component.html',
  styleUrls: ['./payroll-nav.component.scss']
})
export class PayrollNavComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  navLinks = [
    { label: 'Pay Stubs', route: 'pay-stubs' },
    { label: 'W2', route: 'w2' },
    { label: 'Direct Deposit', route: 'direct-deposit' },
    { label: 'W4', route: 'w4' },
    { label: 'Contact Info', route: 'contact-info' },
    { label: 'PRC', route: 'prc' },
    { label: 'Incident Reports', route: 'incident-reports' }
  ];

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
