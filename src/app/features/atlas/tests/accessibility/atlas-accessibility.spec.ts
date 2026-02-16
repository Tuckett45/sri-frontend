/**
 * ATLAS Accessibility Tests
 * 
 * Tests with screen readers
 * Verifies keyboard navigation
 * Checks color contrast
 * 
 * Requirements: 7.11
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DeploymentListComponent } from '../../components/deployments/deployment-list.component';
import { DeploymentDetailComponent } from '../../components/deployments/deployment-detail.component';
import { AIAnalysisComponent } from '../../components/ai-analysis/ai-analysis.component';
import { ApprovalListComponent } from '../../components/approvals/approval-list.component';
import { AtlasLogoComponent } from '../../components/atlas-logo/atlas-logo.component';

describe('ATLAS Accessibility Tests', () => {
  describe('Screen Reader Support', () => {
    let fixture: ComponentFixture<DeploymentListComponent>;
    let component: DeploymentListComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [DeploymentListComponent]
      });

      fixture = TestBed.createComponent(DeploymentListComponent);
      component = fixture.componentInstance;
    });

    it('should have proper ARIA labels on interactive elements', () => {
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        const ariaLabel = button.nativeElement.getAttribute('aria-label');
        const ariaLabelledBy = button.nativeElement.getAttribute('aria-labelledby');
        const textContent = button.nativeElement.textContent.trim();

        expect(ariaLabel || ariaLabelledBy || textContent).toBeTruthy();
      });
    });

    it('should have ARIA roles on custom components', () => {
      fixture.detectChanges();

      const table = fixture.debugElement.query(By.css('[role="table"]'));
      expect(table).toBeTruthy();

      const rows = fixture.debugElement.queryAll(By.css('[role="row"]'));
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should announce loading states to screen readers', () => {
      component.loading = true;
      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.nativeElement.textContent).toContain('Loading');
    });

    it('should announce errors to screen readers', () => {
      component.error = 'Failed to load deployments';
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have descriptive alt text for images', () => {
      const logoFixture = TestBed.createComponent(AtlasLogoComponent);
      logoFixture.detectChanges();

      const images = logoFixture.debugElement.queryAll(By.css('img'));
      
      images.forEach(img => {
        const alt = img.nativeElement.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt.length).toBeGreaterThan(0);
      });
    });

    it('should have proper heading hierarchy', () => {
      const detailFixture = TestBed.createComponent(DeploymentDetailComponent);
      detailFixture.detectChanges();

      const h1 = detailFixture.debugElement.queryAll(By.css('h1'));
      const h2 = detailFixture.debugElement.queryAll(By.css('h2'));
      const h3 = detailFixture.debugElement.queryAll(By.css('h3'));

      // Should have one h1
      expect(h1.length).toBeLessThanOrEqual(1);

      // Headings should be in order
      if (h1.length > 0 && h3.length > 0) {
        expect(h2.length).toBeGreaterThan(0);
      }
    });

    it('should have ARIA labels for form inputs', () => {
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.css('input'));
      
      inputs.forEach(input => {
        const ariaLabel = input.nativeElement.getAttribute('aria-label');
        const ariaLabelledBy = input.nativeElement.getAttribute('aria-labelledby');
        const id = input.nativeElement.getAttribute('id');
        const label = fixture.debugElement.query(By.css(`label[for="${id}"]`));

        expect(ariaLabel || ariaLabelledBy || label).toBeTruthy();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    let fixture: ComponentFixture<DeploymentListComponent>;
    let component: DeploymentListComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [DeploymentListComponent]
      });

      fixture = TestBed.createComponent(DeploymentListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should allow tab navigation through interactive elements', () => {
      const interactiveElements = fixture.debugElement.queryAll(
        By.css('button, a, input, select, textarea, [tabindex]')
      );

      interactiveElements.forEach(element => {
        const tabIndex = element.nativeElement.getAttribute('tabindex');
        
        // Should not have negative tabindex unless intentionally removed from tab order
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1);
        }
      });
    });

    it('should handle Enter key on buttons', () => {
      const button = fixture.debugElement.query(By.css('button'));
      spyOn(component, 'onButtonClick');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.nativeElement.dispatchEvent(event);

      expect(component.onButtonClick).toHaveBeenCalled();
    });

    it('should handle Space key on buttons', () => {
      const button = fixture.debugElement.query(By.css('button'));
      spyOn(component, 'onButtonClick');

      const event = new KeyboardEvent('keydown', { key: ' ' });
      button.nativeElement.dispatchEvent(event);

      expect(component.onButtonClick).toHaveBeenCalled();
    });

    it('should handle Escape key to close modals', () => {
      component.showModal = true;
      fixture.detectChanges();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(component.showModal).toBe(false);
    });

    it('should trap focus within modals', () => {
      component.showModal = true;
      fixture.detectChanges();

      const modal = fixture.debugElement.query(By.css('[role="dialog"]'));
      const focusableElements = modal.queryAll(
        By.css('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      // First element should receive focus
      const firstElement = focusableElements[0].nativeElement;
      expect(document.activeElement).toBe(firstElement);
    });

    it('should support arrow key navigation in lists', () => {
      const listItems = fixture.debugElement.queryAll(By.css('[role="row"]'));
      
      if (listItems.length > 1) {
        const firstItem = listItems[0].nativeElement;
        firstItem.focus();

        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        firstItem.dispatchEvent(event);

        // Second item should be focused
        expect(document.activeElement).toBe(listItems[1].nativeElement);
      }
    });

    it('should have visible focus indicators', () => {
      const button = fixture.debugElement.query(By.css('button'));
      button.nativeElement.focus();

      const styles = window.getComputedStyle(button.nativeElement);
      const outline = styles.getPropertyValue('outline');
      const boxShadow = styles.getPropertyValue('box-shadow');

      // Should have either outline or box-shadow for focus
      expect(outline !== 'none' || boxShadow !== 'none').toBe(true);
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast ratio for normal text (4.5:1)', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const textElements = fixture.debugElement.queryAll(By.css('p, span, div'));
      
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element.nativeElement);
        const color = styles.getPropertyValue('color');
        const backgroundColor = styles.getPropertyValue('background-color');

        const contrastRatio = calculateContrastRatio(color, backgroundColor);
        
        // Normal text should have at least 4.5:1 contrast
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should meet WCAG AA contrast ratio for large text (3:1)', () => {
      const fixture = TestBed.createComponent(DeploymentDetailComponent);
      fixture.detectChanges();

      const headings = fixture.debugElement.queryAll(By.css('h1, h2, h3'));
      
      headings.forEach(heading => {
        const styles = window.getComputedStyle(heading.nativeElement);
        const color = styles.getPropertyValue('color');
        const backgroundColor = styles.getPropertyValue('background-color');
        const fontSize = parseFloat(styles.getPropertyValue('font-size'));

        const contrastRatio = calculateContrastRatio(color, backgroundColor);
        
        // Large text (18pt+ or 14pt+ bold) should have at least 3:1 contrast
        if (fontSize >= 18 || (fontSize >= 14 && styles.fontWeight === 'bold')) {
          expect(contrastRatio).toBeGreaterThanOrEqual(3);
        }
      });
    });

    it('should have sufficient contrast for interactive elements', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button.nativeElement);
        const color = styles.getPropertyValue('color');
        const backgroundColor = styles.getPropertyValue('background-color');

        const contrastRatio = calculateContrastRatio(color, backgroundColor);
        
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should have sufficient contrast for status indicators', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const statusBadges = fixture.debugElement.queryAll(By.css('.status-badge'));
      
      statusBadges.forEach(badge => {
        const styles = window.getComputedStyle(badge.nativeElement);
        const color = styles.getPropertyValue('color');
        const backgroundColor = styles.getPropertyValue('background-color');

        const contrastRatio = calculateContrastRatio(color, backgroundColor);
        
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Focus Management', () => {
    it('should restore focus after modal closes', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const triggerButton = fixture.debugElement.query(By.css('button'));
      triggerButton.nativeElement.focus();
      const originalFocus = document.activeElement;

      // Open modal
      component.showModal = true;
      fixture.detectChanges();

      // Close modal
      component.showModal = false;
      fixture.detectChanges();

      // Focus should return to trigger button
      expect(document.activeElement).toBe(originalFocus);
    });

    it('should move focus to first element in new view', () => {
      const fixture = TestBed.createComponent(DeploymentDetailComponent);
      fixture.detectChanges();

      const firstFocusable = fixture.debugElement.query(
        By.css('button, a, input, [tabindex]:not([tabindex="-1"])')
      );

      expect(document.activeElement).toBe(firstFocusable.nativeElement);
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic HTML elements', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      // Should use semantic elements instead of divs
      const nav = fixture.debugElement.query(By.css('nav'));
      const main = fixture.debugElement.query(By.css('main'));
      const header = fixture.debugElement.query(By.css('header'));

      expect(nav || main || header).toBeTruthy();
    });

    it('should use lists for list content', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const lists = fixture.debugElement.queryAll(By.css('ul, ol'));
      expect(lists.length).toBeGreaterThan(0);
    });
  });

  describe('Form Accessibility', () => {
    it('should associate labels with form controls', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.css('input'));
      
      inputs.forEach(input => {
        const id = input.nativeElement.getAttribute('id');
        const label = fixture.debugElement.query(By.css(`label[for="${id}"]`));
        const ariaLabel = input.nativeElement.getAttribute('aria-label');

        expect(label || ariaLabel).toBeTruthy();
      });
    });

    it('should show validation errors accessibly', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.formErrors = { title: 'Title is required' };
      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should mark required fields', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const requiredInputs = fixture.debugElement.queryAll(By.css('input[required]'));
      
      requiredInputs.forEach(input => {
        const ariaRequired = input.nativeElement.getAttribute('aria-required');
        expect(ariaRequired).toBe('true');
      });
    });
  });
});

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 guidelines
 */
function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(color: string): { r: number; g: number; b: number } {
  // Simple RGB parser (would need enhancement for production)
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
  }
  return { r: 0, g: 0, b: 0 };
}

function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
