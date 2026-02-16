import { Directive, ElementRef, Input, OnInit, HostListener } from '@angular/core';

/**
 * Directive to manage focus and keyboard navigation for ATLAS components
 * Ensures proper focus management and keyboard accessibility
 */
@Directive({
  selector: '[atlasFocus]',
  standalone: true
})
export class AtlasFocusDirective implements OnInit {
  @Input() atlasFocusOnInit = false;
  @Input() atlasFocusTrapEnabled = false;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    if (this.atlasFocusOnInit) {
      setTimeout(() => this.setFocus(), 0);
    }

    // Ensure element is focusable
    if (!this.el.nativeElement.hasAttribute('tabindex')) {
      this.el.nativeElement.setAttribute('tabindex', '0');
    }
  }

  /**
   * Set focus to the element
   */
  setFocus(): void {
    this.el.nativeElement.focus();
  }

  /**
   * Handle keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.atlasFocusTrapEnabled) {
      this.handleFocusTrap(event);
    }
  }

  /**
   * Trap focus within element (for modals/dialogs)
   */
  private handleFocusTrap(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Get all focusable elements within the directive's element
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), ' +
      'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    
    return Array.from(
      this.el.nativeElement.querySelectorAll(selector)
    ) as HTMLElement[];
  }
}
