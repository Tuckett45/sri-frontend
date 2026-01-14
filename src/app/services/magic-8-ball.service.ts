import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationIntegratorService, NotificationPayload, NotificationDeliveryOptions } from './notification-integrator.service';

/**
 * Response from the Magic 8 Ball
 */
export interface Magic8BallResponse {
  /** The user's original question */
  question: string;
  
  /** The Magic 8 Ball's answer */
  answer: string;
  
  /** The category of the response (positive, negative, or neutral) */
  category: 'positive' | 'negative' | 'neutral';
  
  /** When the response was generated */
  timestamp: Date;
}

/**
 * Options for Magic 8 Ball notifications
 */
export interface Magic8BallNotificationOptions {
  /** Whether to show a toast notification (default: true) */
  showToast?: boolean;
  
  /** Whether to send a push notification (default: false) */
  sendPush?: boolean;
  
  /** The type of toast to display (default: 'info') */
  toastType?: 'info' | 'success' | 'warning' | 'error';
  
  /** Custom title for push notifications (default: '🎱 Magic 8 Ball Says...') */
  pushTitle?: string;
}

/**
 * Magic 8 Ball service providing mystical answers to user questions
 * 
 * This service generates random responses to user questions in the style of
 * a classic Magic 8 Ball toy. Responses are categorized as positive, negative,
 * or neutral, and can trigger notifications through the NotificationIntegratorService.
 * 
 * Features:
 * - Random response generation from 25 classic Magic 8 Ball answers
 * - Category-based responses (positive, negative, neutral)
 * - Integrated notification support (toast and push)
 * - Dramatic delay for authentic Magic 8 Ball experience (1-3 seconds)
 * - Non-blocking notification delivery
 * 
 * @example
 * ```typescript
 * magic8BallService.askQuestion('Will it work?', {
 *   showToast: true,
 *   sendPush: false,
 *   toastType: 'info'
 * }).subscribe(response => {
 *   console.log(`Q: ${response.question}`);
 *   console.log(`A: ${response.answer}`);
 *   console.log(`Category: ${response.category}`);
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class Magic8BallService {
  private readonly notificationIntegrator = inject(NotificationIntegratorService);

  private readonly responses = {
    positive: [
      "It is certain",
      "It is decidedly so", 
      "Without a doubt",
      "Yes definitely",
      "You may rely on it",
      "As I see it, yes",
      "Most likely",
      "Outlook good",
      "Yes",
      "Signs point to yes"
    ],
    negative: [
      "Don't count on it",
      "My reply is no",
      "My sources say no", 
      "Outlook not so good",
      "Very doubtful"
    ],
    neutral: [
      "Reply hazy, try again",
      "Ask again later",
      "Better not tell you now",
      "Cannot predict now",
      "Concentrate and ask again"
    ]
  };

  /**
   * Ask the Magic 8 Ball a question and get a response
   * 
   * This method generates a random Magic 8 Ball response and optionally sends
   * notifications through the configured channels. The response is always returned,
   * even if notification delivery fails (non-blocking).
   * 
   * The method includes a dramatic delay (1-3 seconds) to simulate the experience
   * of shaking a real Magic 8 Ball and waiting for the answer to appear.
   * 
   * @param question - The question to ask the Magic 8 Ball
   * @param options - Optional notification settings (defaults: toast=true, push=false)
   * @returns An Observable that emits the Magic 8 Ball response after a delay
   * 
   * @example
   * ```typescript
   * service.askQuestion('Should I deploy on Friday?').subscribe(response => {
   *   console.log(response.answer); // e.g., "Don't count on it"
   *   console.log(response.category); // e.g., "negative"
   * });
   * ```
   */
  askQuestion(question: string, options: Magic8BallNotificationOptions = {}): Observable<Magic8BallResponse> {
    const defaultOptions: Magic8BallNotificationOptions = {
      showToast: true,
      sendPush: false,
      toastType: 'info',
      pushTitle: '🎱 Magic 8 Ball Says...'
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    // Return proper Observable with delay for dramatic effect
    return new Observable(subscriber => {
      setTimeout(async () => {
        const response = this.generateResponse(question);
        
        // Send notifications using the NotificationIntegratorService
        if (finalOptions.showToast || finalOptions.sendPush) {
          try {
            await this.sendNotifications(response, finalOptions);
          } catch (error) {
            // Log error but don't fail the response
            console.error('Failed to send Magic 8 Ball notifications:', error);
          }
        }

        // Always return the response, regardless of notification status
        subscriber.next(response);
        subscriber.complete();
      }, Math.random() * 2000 + 1000); // 1-3 second delay for dramatic effect
    });
  }

  /**
   * Generate a Magic 8 Ball response
   * 
   * Randomly selects a category (positive, negative, neutral) and then randomly
   * selects an answer from that category. This ensures an even distribution across
   * all three response types.
   * 
   * @param question - The user's question (trimmed before storage)
   * @returns A Magic 8 Ball response with question, answer, category, and timestamp
   */
  private generateResponse(question: string): Magic8BallResponse {
    const categories = Object.keys(this.responses) as Array<keyof typeof this.responses>;
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const categoryResponses = this.responses[randomCategory];
    const randomAnswer = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

    return {
      question: question.trim(),
      answer: randomAnswer,
      category: randomCategory,
      timestamp: new Date()
    };
  }

  /**
   * Send notifications using the NotificationIntegratorService
   * 
   * Creates notification payloads for both toast and push notifications with
   * Magic 8 Ball specific styling and metadata. Includes an "Ask Again" action
   * for push notifications and configures navigation to the notifications page.
   * 
   * This method is non-blocking - errors are logged but do not prevent the
   * Magic 8 Ball response from being returned to the user.
   * 
   * @param response - The Magic 8 Ball response to send notifications for
   * @param options - Notification options from the user
   */
  private async sendNotifications(
    response: Magic8BallResponse,
    options: Magic8BallNotificationOptions
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: 'magic-8-ball',
      title: options.pushTitle || '🎱 Magic 8 Ball',
      message: `Q: ${response.question}\nA: ${response.answer}`,
      category: response.category,
      metadata: {
        question: response.question,
        answer: response.answer,
        category: response.category,
        timestamp: response.timestamp.toISOString()
      },
      actions: [
        {
          action: 'ask-again',
          title: 'Ask Again',
          icon: '/assets/icons/refresh.png'
        }
      ]
    };

    const deliveryOptions: NotificationDeliveryOptions = {
      showToast: options.showToast ?? true,
      sendPush: options.sendPush ?? false,
      toastType: options.toastType || 'info',
      pushTitle: options.pushTitle,
      pushIcon: '/assets/icons/magic-8-ball.png',
      pushBadge: '/assets/icons/magic-8-ball-badge.png',
      pushTag: 'magic-8-ball',
      requireInteraction: false,
      navigateOnClick: ['/notifications'] // Navigate to Magic 8 Ball interface on click
    };

    await this.notificationIntegrator.sendNotification(payload, deliveryOptions);
  }

  /**
   * Get all possible responses (for testing or display)
   */
  getAllResponses(): string[] {
    return [
      ...this.responses.positive,
      ...this.responses.negative,
      ...this.responses.neutral
    ];
  }

  /**
   * Get responses by category
   */
  getResponsesByCategory(category: Magic8BallResponse['category']): string[] {
    return this.responses[category];
  }
}