import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-prc',
  templateUrl: './prc.component.html',
  styleUrls: ['./prc.component.scss']
})
export class PrcComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  checklistItems: { id: string; title: string; description: string; acknowledged: boolean; date?: Date }[] = [
    {
      id: '1',
      title: 'Safety Protocols',
      description: 'I acknowledge that I have read and understand all safety protocols and procedures required for my role.',
      acknowledged: false
    },
    {
      id: '2',
      title: 'Code of Conduct',
      description: 'I acknowledge that I have read and will adhere to the company code of conduct and professional standards.',
      acknowledged: false
    },
    {
      id: '3',
      title: 'Data Privacy Policy',
      description: 'I acknowledge that I have read and understand the data privacy policy and my obligations regarding customer data.',
      acknowledged: false
    },
    {
      id: '4',
      title: 'Equipment Responsibility',
      description: 'I acknowledge my responsibility for company-issued equipment and agree to report damage or loss immediately.',
      acknowledged: false
    },
    {
      id: '5',
      title: 'Reporting Obligations',
      description: 'I acknowledge my obligation to report incidents, near-misses, and unsafe conditions promptly.',
      acknowledged: false
    }
  ];

  get allAcknowledged(): boolean {
    return this.checklistItems.every(item => item.acknowledged);
  }

  onCheck(item: { id: string; title: string; description: string; acknowledged: boolean; date?: Date }): void {
    if (item.acknowledged) {
      item.date = new Date();
    } else {
      item.date = undefined;
    }
  }

  submitAcknowledgments(): void {
    // Submit logic here
    console.log('Acknowledgments submitted', this.checklistItems);
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
