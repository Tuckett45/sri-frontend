import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * ATLAS Logo Component
 * 
 * Displays the ATLAS brand logo with automatic theme detection
 * and responsive sizing.
 * 
 * @example
 * <app-atlas-logo size="medium" theme="auto"></app-atlas-logo>
 * <app-atlas-logo size="small" theme="dark" [routerLink]="null"></app-atlas-logo>
 */
@Component({
  selector: 'app-atlas-logo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './atlas-logo.component.html',
  styleUrls: ['./atlas-logo.component.scss']
})
export class AtlasLogoComponent {
  /**
   * Logo size variant
   * - small: 32px height
   * - medium: 48px height (default)
   * - large: 64px height
   */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  
  /**
   * Theme variant
   * - light: Blue logo for light backgrounds
   * - dark: White logo for dark backgrounds
   * - auto: Automatically detect based on system preference (default)
   */
  @Input() theme: 'light' | 'dark' | 'auto' = 'auto';
  
  /**
   * Router link for logo navigation
   * Set to null to disable navigation
   */
  @Input() routerLink: string | null = '/atlas';
  
  /**
   * Alt text for accessibility
   */
  readonly altText = 'ATLAS - Advanced Technology Logistics and Automation System';
  
  /**
   * Get the appropriate logo source based on theme
   */
  get logoSrc(): string {
    if (this.theme === 'auto') {
      return this.isDarkMode 
        ? 'assets/images/atlas/atlas-logo-dark.png'
        : 'assets/images/atlas/atlas-logo-light.png';
    }
    
    return this.theme === 'dark'
      ? 'assets/images/atlas/atlas-logo-dark.png'
      : 'assets/images/atlas/atlas-logo-light.png';
  }
  
  /**
   * Detect if system is in dark mode
   */
  private get isDarkMode(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
  
  /**
   * Get CSS classes for the logo
   */
  get logoClasses(): string {
    return `atlas-logo atlas-logo-${this.size}`;
  }
}
