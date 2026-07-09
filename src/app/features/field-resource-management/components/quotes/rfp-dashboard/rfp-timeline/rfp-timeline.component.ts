import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardQuote } from '../../../../models/quote-workflow.model';

/**
 * Timeline step definition for the RFP lifecycle.
 */
export interface TimelineStep {
  label: string;
  icon: string;
  dateField: keyof DashboardQuote | null;
  status: 'completed' | 'active' | 'pending';
  date: string | null;
  tooltip: string;
}

/**
 * RFP Timeline Component
 *
 * Displays a visual horizontal timeline showing the progression of an RFP
 * through its lifecycle stages: RFP Received -> Quote Submitted -> PO Received
 * -> Job Started -> Job Complete -> Invoiced/Closeout.
 *
 * Each step shows its completion date and visual status indicator.
 */
@Component({
  selector: 'app-rfp-timeline',
  templateUrl: './rfp-timeline.component.html',
  styleUrls: ['./rfp-timeline.component.scss']
})
export class RfpTimelineComponent implements OnChanges {
  @Input() record!: DashboardQuote;

  steps: TimelineStep[] = [];
  progressPercentage = 0;
  currentStageLabel = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['record'] && this.record) {
      this.buildTimeline();
    }
  }

  private buildTimeline(): void {
    const r = this.record;

    const rawSteps: Array<{
      label: string;
      icon: string;
      dateField: keyof DashboardQuote | null;
      date: string | null;
      tooltip: string;
    }> = [
      {
        label: 'RFP Received',
        icon: 'inbox',
        dateField: 'rfpReceiveDate',
        date: r.rfpReceiveDate,
        tooltip: 'Date the RFP was received from the customer'
      },
      {
        label: 'Quote Submitted',
        icon: 'send',
        dateField: 'quoteSubmittedDate',
        date: r.quoteSubmittedDate,
        tooltip: 'Date the quote was submitted to the customer'
      },
      {
        label: 'PO Received',
        icon: 'receipt',
        dateField: 'poReceivedDate',
        date: r.poReceivedDate,
        tooltip: 'Date the purchase order was received'
      },
      {
        label: 'Job Started',
        icon: 'engineering',
        dateField: 'jobStart',
        date: r.jobStart,
        tooltip: 'Date the job work began'
      },
      {
        label: 'Job Complete',
        icon: 'task_alt',
        dateField: 'jobComplete',
        date: r.jobComplete,
        tooltip: 'Date the job work was completed'
      },
      {
        label: 'Invoiced / Closeout',
        icon: 'paid',
        dateField: 'invoiceNumber',
        date: r.invoiceNumber ? r.jobComplete : null, // Use job complete date as proxy for invoice date
        tooltip: r.invoiceNumber ? `Invoice #${r.invoiceNumber}` : 'Pending invoice and closeout'
      }
    ];

    // Determine which steps are completed
    let lastCompletedIndex = -1;
    for (let i = 0; i < rawSteps.length; i++) {
      if (rawSteps[i].date) {
        lastCompletedIndex = i;
      } else {
        break; // Stop at first non-completed step to maintain order
      }
    }

    this.steps = rawSteps.map((step, index) => {
      let status: 'completed' | 'active' | 'pending';
      if (index <= lastCompletedIndex) {
        status = 'completed';
      } else if (index === lastCompletedIndex + 1) {
        status = 'active';
      } else {
        status = 'pending';
      }
      return { ...step, status };
    });

    // Calculate progress
    const completedCount = lastCompletedIndex + 1;
    this.progressPercentage = Math.round((completedCount / rawSteps.length) * 100);

    // Determine current stage label
    if (lastCompletedIndex >= 0 && lastCompletedIndex < rawSteps.length - 1) {
      this.currentStageLabel = rawSteps[lastCompletedIndex + 1].label;
    } else if (lastCompletedIndex === rawSteps.length - 1) {
      this.currentStageLabel = 'Complete';
    } else {
      this.currentStageLabel = 'Not Started';
    }
  }

  getElapsedDays(): number {
    if (!this.record.rfpReceiveDate) return 0;
    const start = new Date(this.record.rfpReceiveDate);
    const end = this.record.jobComplete ? new Date(this.record.jobComplete) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  getDaysBetweenSteps(stepIndex: number): number | null {
    if (stepIndex <= 0) return null;
    const currentDate = this.steps[stepIndex]?.date;
    const prevDate = this.steps[stepIndex - 1]?.date;
    if (!currentDate || !prevDate) return null;
    const diff = new Date(currentDate).getTime() - new Date(prevDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
