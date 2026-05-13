import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Technician } from '../../../models/technician.model';
import { ChecklistSummary } from '../../../utils/checklist-delta.util';

@Component({
  selector: 'app-onboarding-progress-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="checklistSummary; else noTemplate">
      <div class="progress-header-container">
        <div class="progress-header-top">
          <div class="progress-info">
            <h3 class="progress-title">Onboarding Progress</h3>
            <div class="progress-counts">
              <span class="count-badge count-complete">
                {{ checklistSummary.completeCount }} Complete
              </span>
              <span class="count-badge count-missing">
                {{ checklistSummary.missingCount }} Missing
              </span>
              <span class="count-badge count-expired">
                {{ checklistSummary.expiredCount }} Expired
              </span>
            </div>
          </div>
          <div class="progress-badges">
            <span
              *ngIf="checklistSummary.isReadyToStart"
              class="ready-badge"
            >
              Ready to Start
            </span>
            <span
              *ngIf="prcIndicator === 'upcoming'"
              class="prc-badge prc-upcoming"
            >
              PRC Upcoming
            </span>
            <span
              *ngIf="prcIndicator === 'overdue'"
              class="prc-badge prc-overdue"
            >
              PRC Overdue
            </span>
          </div>
        </div>
        <div class="progress-bar-container">
          <div
            class="progress-bar-fill"
            [style.width.%]="checklistSummary.completionPercentage"
            [attr.aria-valuenow]="checklistSummary.completionPercentage"
            aria-valuemin="0"
            aria-valuemax="100"
            role="progressbar"
            [attr.aria-label]="'Onboarding completion: ' + checklistSummary.completionPercentage + '%'"
          ></div>
        </div>
        <div class="progress-percentage">
          {{ checklistSummary.completionPercentage | number:'1.0-0' }}% Complete
        </div>
      </div>
    </ng-container>
    <ng-template #noTemplate>
      <div class="no-template-message" role="status">
        <span class="no-template-icon" aria-hidden="true">ℹ</span>
        <span class="no-template-text">No onboarding template configured for this role</span>
      </div>
    </ng-template>
  `,
  styles: [`
    .progress-header-container {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .progress-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .progress-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #212121;
    }

    .progress-counts {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .count-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .count-complete {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .count-missing {
      background-color: #fff3e0;
      color: #e65100;
    }

    .count-expired {
      background-color: #ffebee;
      color: #c62828;
    }

    .progress-badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .ready-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      background-color: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #a5d6a7;
    }

    .prc-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .prc-upcoming {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .prc-overdue {
      background-color: #ffebee;
      color: #c62828;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-bar-fill {
      height: 100%;
      background-color: #1976d2;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-percentage {
      font-size: 0.875rem;
      font-weight: 500;
      color: #616161;
    }

    .no-template-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      background-color: #e3f2fd;
      border: 1px solid #90caf9;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }

    .no-template-icon {
      font-size: 1.125rem;
      color: #1565c0;
    }

    .no-template-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: #1565c0;
    }

    @media (max-width: 768px) {
      .progress-header-top {
        flex-direction: column;
        gap: 0.75rem;
      }

      .progress-header-container {
        padding: 1rem;
      }
    }
  `]
})
export class OnboardingProgressHeaderComponent {
  @Input() technician!: Technician;
  @Input() checklistSummary: ChecklistSummary | null = null;
  @Input() prcIndicator: 'upcoming' | 'overdue' | null = null;
}
