import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { KeyboardNavigationService } from '../services/keyboard-navigation.service';

/**
 * Directive to trap focus within an element (for modals/dialogs)
 * Usage: <div frmFocusTrap>...</div>
 */
@Directive({
  selector: '[frmFocusTrap]',
  standalone: true
})
export class FocusTrapDirective implements OnInit, OnDestroy {
  private cleanup?: () => void;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private keyboardNavigationService: KeyboardNavigationService
  ) {}

  ngOnInit(): void {
    // Trap focus within this element
    this.cleanup = this.keyboardNavigationService.trapFocus(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    // Clean up focus trap
    if (this.cleanup) {
      this.cleanup();
    }
  }
}
