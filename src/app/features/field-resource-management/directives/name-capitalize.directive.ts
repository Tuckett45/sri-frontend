import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Directive that auto-capitalizes the first letter of each word on blur.
 * Useful for name fields to enforce consistent "Title Case" formatting.
 */
@Directive({
  selector: '[appNameCapitalize]'
})
export class NameCapitalizeDirective {
  constructor(
    private el: ElementRef<HTMLInputElement>,
    private ngControl: NgControl
  ) {}

  @HostListener('blur')
  onBlur(): void {
    const value = this.el.nativeElement.value;
    if (!value || !value.trim()) return;

    const capitalized = this.toTitleCase(value);
    if (capitalized !== value) {
      this.el.nativeElement.value = capitalized;
      this.ngControl.control?.setValue(capitalized, { emitEvent: true });
    }
  }

  private toTitleCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/(?:^|\s|[-'])\S/g, (match) => match.toUpperCase());
  }
}
