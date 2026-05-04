import { Component, Inject, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

/**
 * Confirm Dialog Data Interface
 */
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'danger';
}

/**
 * Confirm Dialog Component
 * 
 * A reusable confirmation dialog with customizable content and variants.
 * Supports keyboard navigation (Enter to confirm, Escape to cancel).
 * 
 * Variants:
 * - info: Blue theme for informational confirmations
 * - warning: Orange theme for warning confirmations
 * - danger: Red theme for destructive actions
 * 
 * @example
 * const dialogRef = this.dialog.open(ConfirmDialogComponent, {
 *   data: {
 *     title: 'Delete Job',
 *     message: 'Are you sure you want to delete this job?',
 *     confirmText: 'Delete',
 *     cancelText: 'Cancel',
 *     variant: 'danger'
 *   }
 * });
 * 
 * dialogRef.afterClosed().subscribe(result => {
 *   if (result) {
 *     // User confirmed
 *   }
 * });
 */
@Component({
  selector: 'frm-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    // Set default values
    this.data.confirmText = this.data.confirmText || 'Confirm';
    this.data.cancelText = this.data.cancelText || 'Cancel';
    this.data.variant = this.data.variant || 'info';
  }

  /**
   * Handle Enter key press to confirm
   */
  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: Event): void {
    event.preventDefault();
    this.onConfirm();
  }

  /**
   * Handle Escape key press to cancel
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    event.preventDefault();
    this.onCancel();
  }

  /**
   * Get icon based on variant
   */
  get variantIcon(): string {
    const iconMap = {
      info: 'info',
      warning: 'warning',
      danger: 'error'
    };
    return iconMap[this.data.variant || 'info'];
  }

  /**
   * Get color based on variant
   */
  get variantColor(): 'primary' | 'accent' | 'warn' {
    const colorMap = {
      info: 'primary' as const,
      warning: 'accent' as const,
      danger: 'warn' as const
    };
    return colorMap[this.data.variant || 'info'];
  }

  /**
   * Handle confirm action
   */
  onConfirm(): void {
    this.dialogRef.close(true);
  }

  /**
   * Handle cancel action
   */
  onCancel(): void {
    this.dialogRef.close(false);
  }
}
