import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Skip navigation component for accessibility
 * Provides skip links for keyboard users to bypass navigation
 */
@Component({
  selector: 'frm-skip-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skip-navigation.component.html',
  styleUrls: ['./skip-navigation.component.scss']
})
export class SkipNavigationComponent {
  /**
   * Skip to main content
   */
  skipToMain(): void {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  }

  /**
   * Skip to navigation
   */
  skipToNavigation(): void {
    const navigation = document.getElementById('main-navigation');
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView();
    }
  }
}
