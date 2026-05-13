import { Directive, ElementRef, HostListener, Input } from '@angular/core';

/**
 * Directive for skip navigation links
 * Allows keyboard users to skip repetitive navigation
 */
@Directive({
  selector: '[atlasSkipLink]',
  standalone: true
})
export class AtlasSkipLinkDirective {
  @Input() atlasSkipLink!: string;

  constructor(private el: ElementRef) {
    // Ensure skip link is visible on focus
    this.el.nativeElement.classList.add('atlas-skip-link');
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.preventDefault();
    const targetElement = document.getElementById(this.atlasSkipLink);
    
    if (targetElement) {
      // Set tabindex if not already focusable
      if (!targetElement.hasAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
      }
      
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
