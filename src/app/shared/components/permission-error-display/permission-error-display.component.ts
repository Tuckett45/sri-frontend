import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Permission Error Display Component
 * 
 * Displays access denied messages for permission failures.
 * 
 * Features:
 * - User-friendly access denied messages
 * - Customizable message and action buttons
 * - Support for different permission error types
 * 
 * Requirements: 18.4
 */
@Component({
  selector: 'app-permission-error-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permission-error-display.component.html',
  styleUrls: ['./permission-error-display.component.scss']
})
export class PermissionErrorDisplayComponent {
  /**
   * Custom error message (optional)
   * If not provided, uses default message
   */
  @Input() message?: string;

  /**
   * Show contact admin button
   */
  @Input() showContactButton: boolean = true;

  /**
   * Show go back button
   */
  @Input() showBackButton: boolean = true;

  /**
   * Get the display message
   */
  get displayMessage(): string {
    return this.message || 'You do not have permission to access this resource. Please contact your administrator if you need access.';
  }

  /**
   * Handle go back action
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * Handle contact admin action
   */
  contactAdmin(): void {
    // In a real application, this would open a contact form or email client
    // For now, we'll just log the action
    console.log('Contact admin requested');
  }
}
