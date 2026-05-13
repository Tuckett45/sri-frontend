import { Injectable } from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

/**
 * Service for managing keyboard navigation and shortcuts
 */
@Injectable({
  providedIn: 'root'
})
export class KeyboardNavigationService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;

  constructor(private focusMonitor: FocusMonitor) {
    this.registerDefaultShortcuts();
  }

  /**
   * Register default keyboard shortcuts
   */
  private registerDefaultShortcuts(): void {
    // Escape to close dialogs/modals
    this.registerShortcut('escape', {
      key: 'Escape',
      description: 'Close dialog or modal',
      action: () => {
        // This will be handled by individual components
        // Just emit an event that components can listen to
        document.dispatchEvent(new CustomEvent('keyboard-escape'));
      }
    });
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(id: string, shortcut: KeyboardShortcut): void {
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Handle keyboard event
   */
  handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!this.enabled) {
      return false;
    }

    // Don't handle shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape key even in input fields
      if (event.key !== 'Escape') {
        return false;
      }
    }

    // Check each registered shortcut
    for (const [id, shortcut] of this.shortcuts.entries()) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        shortcut.action();
        return true;
      }
    }

    return false;
  }

  /**
   * Check if event matches shortcut
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
    const ctrlMatches = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
    const altMatches = shortcut.alt === undefined || event.altKey === shortcut.alt;
    const shiftMatches = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
    const metaMatches = shortcut.meta === undefined || event.metaKey === shortcut.meta;

    return keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches;
  }

  /**
   * Enable keyboard shortcuts
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable keyboard shortcuts
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Focus an element by ID
   */
  focusElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  }

  /**
   * Focus the first focusable element in a container
   */
  focusFirstInContainer(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Focus the last focusable element in a container
   */
  focusLastInContainer(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }

  /**
   * Get all focusable elements in a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Trap focus within a container (for modals/dialogs)
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) {
      return () => {};
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      if (event.shiftKey) {
        // Shift+Tab: moving backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    firstElement.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Monitor focus on an element
   */
  monitorFocus(element: HTMLElement): void {
    this.focusMonitor.monitor(element);
  }

  /**
   * Stop monitoring focus on an element
   */
  stopMonitoringFocus(element: HTMLElement): void {
    this.focusMonitor.stopMonitoring(element);
  }
}
