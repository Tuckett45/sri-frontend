import { 
  Directive, 
  ElementRef, 
  HostListener, 
  Input, 
  OnInit, 
  OnDestroy,
  Output,
  EventEmitter
} from '@angular/core';
import { AtlasKeyboardNavService } from '../services/atlas-keyboard-nav.service';

/**
 * Directive for implementing roving tabindex pattern
 * Allows arrow key navigation through a list of items
 * Only one item in the list is tabbable at a time
 */
@Directive({
  selector: '[atlasRovingTabindex]',
  standalone: true
})
export class AtlasRovingTabindexDirective implements OnInit, OnDestroy {
  @Input() atlasRovingTabindex: 'vertical' | 'horizontal' = 'vertical';
  @Input() atlasRovingActive = false;
  @Output() atlasRovingFocus = new EventEmitter<number>();

  private items: HTMLElement[] = [];
  private currentIndex = 0;

  constructor(
    private el: ElementRef,
    private keyboardNav: AtlasKeyboardNavService
  ) {}

  ngOnInit(): void {
    this.updateItems();
    this.updateTabindices();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Update list of focusable items
   */
  private updateItems(): void {
    this.items = this.keyboardNav.getFocusableElements(this.el.nativeElement);
    
    // Find currently focused item
    const focusedIndex = this.items.findIndex(item => 
      this.keyboardNav.isFocused(item)
    );
    
    if (focusedIndex >= 0) {
      this.currentIndex = focusedIndex;
    } else if (this.atlasRovingActive) {
      this.currentIndex = 0;
    }
  }

  /**
   * Update tabindex attributes for all items
   */
  private updateTabindices(): void {
    this.items.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.setAttribute('tabindex', '0');
      } else {
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  /**
   * Handle keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Only handle if target is one of our items
    if (!this.items.includes(target)) {
      return;
    }

    this.currentIndex = this.items.indexOf(target);
    
    const newIndex = this.keyboardNav.handleArrowNavigation(
      event,
      this.items,
      this.currentIndex,
      this.atlasRovingTabindex
    );

    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      this.updateTabindices();
      this.atlasRovingFocus.emit(this.currentIndex);
    }
  }

  /**
   * Handle focus events to update current index
   */
  @HostListener('focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const index = this.items.indexOf(target);
    
    if (index >= 0) {
      this.currentIndex = index;
      this.updateTabindices();
      this.atlasRovingFocus.emit(this.currentIndex);
    }
  }

  /**
   * Refresh items list (call when items change)
   */
  refresh(): void {
    this.updateItems();
    this.updateTabindices();
  }

  /**
   * Set focus to specific index
   */
  focusIndex(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.updateTabindices();
      this.items[index].focus();
      this.atlasRovingFocus.emit(this.currentIndex);
    }
  }
}
