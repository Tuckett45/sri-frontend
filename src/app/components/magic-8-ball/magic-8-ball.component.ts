import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Magic8BallService, Magic8BallResponse, Magic8BallNotificationOptions } from '../../services/magic-8-ball.service';

@Component({
  selector: 'app-magic-8-ball',
  templateUrl: './magic-8-ball.component.html',
  styleUrls: ['./magic-8-ball.component.scss'],
  standalone: false
})
export class Magic8BallComponent {
  private readonly magic8Ball = inject(Magic8BallService);
  private readonly fb = inject(FormBuilder);

  protected readonly questionForm: FormGroup;
  protected readonly isShaking = signal(false);
  protected readonly currentResponse = signal<Magic8BallResponse | null>(null);
  protected readonly responseHistory = signal<Magic8BallResponse[]>([]);

  constructor() {
    this.questionForm = this.fb.group({
      question: ['', [Validators.required, Validators.minLength(3)]],
      showToast: [true],
      sendPush: [false],
      toastType: ['info']
    });
  }

  protected onAskQuestion(): void {
    if (this.questionForm.invalid) {
      return;
    }

    const formValue = this.questionForm.value;
    const question = formValue.question.trim();
    
    if (!question) {
      return;
    }

    // Start shaking animation
    this.isShaking.set(true);

    const options: Magic8BallNotificationOptions = {
      showToast: formValue.showToast,
      sendPush: formValue.sendPush,
      toastType: formValue.toastType
    };

    // Ask the Magic 8 Ball
    this.magic8Ball.askQuestion(question, options).subscribe({
      next: (response) => {
        // Stop shaking and show response
        this.isShaking.set(false);
        this.currentResponse.set(response);
        
        // Add to history
        const history = this.responseHistory();
        this.responseHistory.set([response, ...history.slice(0, 9)]); // Keep last 10
        
        // Clear the question form
        this.questionForm.patchValue({ question: '' });
      },
      error: (error) => {
        console.error('Magic 8 Ball error:', error);
        this.isShaking.set(false);
      }
    });
  }

  protected onClearHistory(): void {
    this.responseHistory.set([]);
    this.currentResponse.set(null);
  }

  protected onAskAgain(): void {
    if (this.currentResponse()) {
      this.questionForm.patchValue({ 
        question: this.currentResponse()!.question 
      });
      this.onAskQuestion();
    }
  }

  protected getResponseClass(category: Magic8BallResponse['category']): string {
    switch (category) {
      case 'positive': return 'response-positive';
      case 'negative': return 'response-negative';
      case 'neutral': return 'response-neutral';
      default: return '';
    }
  }

  protected getResponseIcon(category: Magic8BallResponse['category']): string {
    switch (category) {
      case 'positive': return '✅';
      case 'negative': return '❌';
      case 'neutral': return '🤔';
      default: return '🎱';
    }
  }

  protected trackByTimestamp(index: number, response: Magic8BallResponse): string {
    return response.timestamp.toISOString();
  }
}