import { Directive, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AtlasAccessibilityService } from '../utils/accessibility.service';

/**
 * Directive for announcing changes to screen readers
 * Usage: <div atlasAnnounce [atlasAnnounceMessage]="message" [atlasAnnouncePriority]="'assertive'"></div>
 */
@Directive({
  selector: '[atlasAnnounce]',
  standalone: true
})
export class AtlasAnnounceDirective implements OnChanges {
  @Input() atlasAnnounceMessage?: string;
  @Input() atlasAnnouncePriority: 'polite' | 'assertive' = 'polite';
  @Input() atlasAnnounceOnChange = true;

  constructor(private a11y: AtlasAccessibilityService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.atlasAnnounceOnChange && changes['atlasAnnounceMessage']) {
      const message = changes['atlasAnnounceMessage'].currentValue;
      if (message) {
        this.a11y.announce(message, this.atlasAnnouncePriority);
      }
    }
  }

  /**
   * Manually trigger announcement
   */
  announce(message?: string): void {
    const msg = message || this.atlasAnnounceMessage;
    if (msg) {
      this.a11y.announce(msg, this.atlasAnnouncePriority);
    }
  }
}
