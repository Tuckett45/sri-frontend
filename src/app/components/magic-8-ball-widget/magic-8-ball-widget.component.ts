import { Component, inject } from '@angular/core';
import { Magic8BallService } from '../../services/magic-8-ball.service';

@Component({
  selector: 'app-magic-8-ball-widget',
  templateUrl: './magic-8-ball-widget.component.html',
  styleUrls: ['./magic-8-ball-widget.component.scss'],
  standalone: false
})
export class Magic8BallWidgetComponent {
  private readonly magic8Ball = inject(Magic8BallService);

  protected readonly quickQuestions = [
    "Will my deployment be successful?",
    "Should I approve this change?",
    "Is the system ready for production?",
    "Will this fix the issue?",
    "Should I escalate this problem?"
  ];

  protected onQuickQuestion(question: string): void {
    // Use the Magic 8 Ball with notifications enabled
    this.magic8Ball.askQuestion(question, {
      showToast: true,
      sendPush: false, // Don't spam with push notifications for quick questions
      toastType: 'info'
    }).subscribe({
      next: (response) => {
        console.log('Magic 8 Ball response:', response);
      },
      error: (error) => {
        console.error('Magic 8 Ball error:', error);
      }
    });
  }

  protected onNavigateToFullMagic8Ball(): void {
    // This could navigate to the full Magic 8 Ball component
    window.location.href = '/magic-8-ball';
  }
}