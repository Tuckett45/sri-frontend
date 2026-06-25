import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Directive that formats phone input as (XXX) XXX-XXXX.
 * Strips non-digit characters, limits to 10 digits, and applies the mask on input.
 * Works with reactive forms by updating the form control value with the formatted string.
 */
@Directive({
  selector: '[appPhoneMask]'
})
export class PhoneMaskDirective implements OnInit {
  constructor(
    private el: ElementRef<HTMLInputElement>,
    private ngControl: NgControl
  ) {}

  ngOnInit(): void {
    // Format any pre-populated value
    const initial = this.el.nativeElement.value;
    if (initial) {
      const formatted = this.applyMask(initial);
      this.el.nativeElement.value = formatted;
      this.ngControl.control?.setValue(formatted, { emitEvent: false });
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const input = this.el.nativeElement;
    const formatted = this.applyMask(input.value);
    input.value = formatted;
    this.ngControl.control?.setValue(formatted, { emitEvent: false });
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    // Let the input event handle the formatting after paste
    setTimeout(() => {
      const input = this.el.nativeElement;
      const formatted = this.applyMask(input.value);
      input.value = formatted;
      this.ngControl.control?.setValue(formatted, { emitEvent: false });
    });
  }

  private applyMask(value: string): string {
    // Strip everything except digits
    const digits = value.replace(/\D/g, '').slice(0, 10);

    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
}
