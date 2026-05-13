import { Directive, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * Directive for handling keyboard shortcuts
 * Usage: <div [frmKeyboardShortcut]="{key: 's', ctrl: true}" (shortcutTriggered)="onSave()">
 */
@Directive({
  selector: '[frmKeyboardShortcut]',
  standalone: true
})
export class KeyboardShortcutDirective {
  @Input() frmKeyboardShortcut!: KeyboardShortcut;
  @Output() shortcutTriggered = new EventEmitter<KeyboardEvent>();

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.frmKeyboardShortcut) {
      return;
    }

    const shortcut = this.frmKeyboardShortcut;
    const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
    const ctrlMatches = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
    const altMatches = shortcut.alt === undefined || event.altKey === shortcut.alt;
    const shiftMatches = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
    const metaMatches = shortcut.meta === undefined || event.metaKey === shortcut.meta;

    if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
      event.preventDefault();
      this.shortcutTriggered.emit(event);
    }
  }
}
