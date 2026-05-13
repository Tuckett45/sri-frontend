import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Highlight Pipe
 * 
 * Highlights search terms in text by wrapping them in a span with a CSS class.
 * Uses DomSanitizer to safely render HTML with highlighted terms.
 * 
 * Usage:
 * {{ text | highlight: searchTerm }}
 * 
 * Example:
 * {{ 'John Doe' | highlight: 'john' }} => '<span class="highlight">John</span> Doe'
 */
@Pipe({
  name: 'highlight'
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, searchTerm: string): SafeHtml {
    if (!value || !searchTerm) {
      return value;
    }

    // Escape special regex characters in search term
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create case-insensitive regex
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    
    // Replace matches with highlighted span
    const highlighted = value.replace(regex, '<span class="search-highlight">$1</span>');
    
    // Sanitize and return as safe HTML
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
