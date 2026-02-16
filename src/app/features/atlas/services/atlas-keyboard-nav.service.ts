import { Injectable } from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

/**
 * Service for managing keyboard navigation across ATLAS components
 * Provides utilities for keyboard shortcuts, focus management, and navigation patterns
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasKeyboardNavService {
  private destroy$ = new Subject<void>();
  private keyboardShortcuts = new Map<string, () => void>();

  constructor() {
    this.initializeGlobalKeyboardHandlers();
  }

  /**
   * Initialize global keyboard event handlers
   */
  private initializeGlobalKeyboardHandlers(): void {
    if (typeof document !== 'undefined') {
      fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(
          filter(event => this.shouldHandleEvent(event)),
          takeUntil(this.destroy$)
        )
        .subscribe(event => this.handleGlobalKeydown(event));
    }
  }

  /**
   * Check if event should be handled globally
   */
  private shouldHandleEvent(event: KeyboardEvent): boolean {
    // Don't handle if user is typing in an input
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    
    if (['input', 'textarea', 'select'].includes(tagName)) {
      return false;
    }

    // Don't handle if contenteditable
    if (target.isContentEditable) {
      return false;
    }

    return true;
  }

  /**
   * Handle global keyboard events
   */
  private handleGlobalKeydown(event: KeyboardEvent): void {
    const key = this.getKeyCombo(event);
    const handler = this.keyboardShortcuts.get(key);
    
    if (handler) {
      event.preventDefault();
      handler();
    }
  }

  /**
   * Get keyboard combination string
   */
  private getKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  /**
   * Register a keyboard shortcut
   * @param key - Key combination (e.g., 'ctrl+k', 'alt+n')
   * @param handler - Function to call when shortcut is triggered
   */
  registerShortcut(key: string, handler: () => void): void {
    this.keyboardShortcuts.set(key.toLowerCase(), handler);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(key: string): void {
    this.keyboardShortcuts.delete(key.toLowerCase());
  }

  /**
   * Navigate to first focusable element in container
   */
  focusFirst(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  /**
   * Navigate to last focusable element in container
   */
  focusLast(container: HTMLElement): void {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    }
  }

  /**
   * Navigate to next focusable element
   */
  focusNext(currentElement: HTMLElement, container?: HTMLElement): void {
    const focusable = this.getFocusableElements(container || document.body);
    const currentIndex = focusable.indexOf(currentElement);
    
    if (currentIndex >= 0 && currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus();
    }
  }

  /**
   * Navigate to previous focusable element
   */
  focusPrevious(currentElement: HTMLElement, container?: HTMLElement): void {
    const focusable = this.getFocusableElements(container || document.body);
    const currentIndex = focusable.indexOf(currentElement);
    
    if (currentIndex > 0) {
      focusable[currentIndex - 1].focus();
    }
  }

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = 
      'a[href]:not([disabled]), ' +
      'button:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      'input:not([disabled]), ' +
      'select:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"]):not([disabled])';
    
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Handle arrow key navigation in a list
   * @param event - Keyboard event
   * @param items - Array of list items
   * @param currentIndex - Current focused item index
   * @param orientation - 'vertical' or 'horizontal'
   * @returns New focused index
   */
  handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    orientation: 'vertical' | 'horizontal' = 'vertical'
  ): number {
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    let newIndex = currentIndex;

    if (event.key === nextKey) {
      event.preventDefault();
      newIndex = Math.min(currentIndex + 1, items.length - 1);
    } else if (event.key === prevKey) {
      event.preventDefault();
      newIndex = Math.max(currentIndex - 1, 0);
    } else if (event.key === 'Home') {
      event.preventDefault();
      newIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      newIndex = items.length - 1;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }

    return newIndex;
  }

  /**
   * Handle grid navigation (2D arrow key navigation)
   * @param event - Keyboard event
   * @param rows - Number of rows
   * @param cols - Number of columns
   * @param currentRow - Current row index
   * @param currentCol - Current column index
   * @returns New [row, col] position
   */
  handleGridNavigation(
    event: KeyboardEvent,
    rows: number,
    cols: number,
    currentRow: number,
    currentCol: number
  ): [number, number] {
    let newRow = currentRow;
    let newCol = currentCol;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newRow = Math.max(0, currentRow - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        newRow = Math.min(rows - 1, currentRow + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newCol = Math.max(0, currentCol - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        newCol = Math.min(cols - 1, currentCol + 1);
        break;
      case 'Home':
        event.preventDefault();
        newCol = 0;
        break;
      case 'End':
        event.preventDefault();
        newCol = cols - 1;
        break;
      case 'PageUp':
        event.preventDefault();
        newRow = 0;
        break;
      case 'PageDown':
        event.preventDefault();
        newRow = rows - 1;
        break;
    }

    return [newRow, newCol];
  }

  /**
   * Trap focus within a container (for modals/dialogs)
   * @param container - Container element
   * @param event - Keyboard event
   */
  trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const focusable = this.getFocusableElements(container);
    if (focusable.length === 0) {
      return;
    }

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Restore focus to a previously focused element
   * @param element - Element to restore focus to
   */
  restoreFocus(element: HTMLElement | null): void {
    if (element && typeof element.focus === 'function') {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => element.focus(), 0);
    }
  }

  /**
   * Save current focus for later restoration
   * @returns Currently focused element
   */
  saveFocus(): HTMLElement | null {
    return document.activeElement as HTMLElement;
  }

  /**
   * Check if element is currently focused
   */
  isFocused(element: HTMLElement): boolean {
    return document.activeElement === element;
  }

  /**
   * Clean up service
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.keyboardShortcuts.clear();
  }
}
