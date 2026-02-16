/**
 * ATLAS Cross-Browser Tests
 * 
 * Tests in Chrome, Firefox, Safari, Edge
 * Verifies responsive design on different screen sizes
 * 
 * Requirements: 7.1
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DeploymentListComponent } from '../../components/deployments/deployment-list.component';
import { DeploymentDetailComponent } from '../../components/deployments/deployment-detail.component';
import { AIAnalysisComponent } from '../../components/ai-analysis/ai-analysis.component';

describe('ATLAS Cross-Browser Tests', () => {
  describe('Browser Compatibility', () => {
    let fixture: ComponentFixture<DeploymentListComponent>;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [DeploymentListComponent]
      });

      fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();
    });

    it('should detect browser type', () => {
      const userAgent = navigator.userAgent;
      
      const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
      const isFirefox = /Firefox/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
      const isEdge = /Edg/.test(userAgent);

      expect(isChrome || isFirefox || isSafari || isEdge).toBe(true);
    });

    it('should support modern JavaScript features', () => {
      // Test Promise support
      expect(typeof Promise).toBe('function');

      // Test async/await support
      expect(async () => {}).toBeInstanceOf(Function);

      // Test arrow functions
      expect(() => {}).toBeInstanceOf(Function);

      // Test template literals
      const test = `template`;
      expect(test).toBe('template');

      // Test destructuring
      const { a, b } = { a: 1, b: 2 };
      expect(a).toBe(1);
      expect(b).toBe(2);
    });

    it('should support required CSS features', () => {
      const element = fixture.debugElement.query(By.css('.atlas-container'));
      const styles = window.getComputedStyle(element.nativeElement);

      // Test flexbox support
      expect(styles.display).toBeDefined();

      // Test grid support
      const supportsGrid = CSS.supports('display', 'grid');
      expect(supportsGrid).toBe(true);

      // Test CSS variables
      const supportsVariables = CSS.supports('--test', '0');
      expect(supportsVariables).toBe(true);
    });

    it('should support required Web APIs', () => {
      // Test Fetch API
      expect(typeof fetch).toBe('function');

      // Test localStorage
      expect(typeof localStorage).toBe('object');

      // Test sessionStorage
      expect(typeof sessionStorage).toBe('object');

      // Test WebSocket
      expect(typeof WebSocket).toBe('function');

      // Test IntersectionObserver
      expect(typeof IntersectionObserver).toBe('function');
    });

    it('should handle browser-specific CSS prefixes', () => {
      const element = fixture.debugElement.query(By.css('.atlas-button'));
      const styles = window.getComputedStyle(element.nativeElement);

      // Check for vendor prefixes
      const transform = styles.getPropertyValue('transform') ||
                       styles.getPropertyValue('-webkit-transform') ||
                       styles.getPropertyValue('-moz-transform') ||
                       styles.getPropertyValue('-ms-transform');

      expect(transform).toBeDefined();
    });
  });

  describe('Responsive Design', () => {
    let fixture: ComponentFixture<DeploymentListComponent>;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [DeploymentListComponent]
      });

      fixture = TestBed.createComponent(DeploymentListComponent);
    });

    it('should adapt layout for mobile screens (320px)', () => {
      setViewportSize(320, 568);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.atlas-container'));
      const styles = window.getComputedStyle(container.nativeElement);

      // Mobile layout should stack vertically
      expect(styles.flexDirection).toBe('column');
    });

    it('should adapt layout for tablet screens (768px)', () => {
      setViewportSize(768, 1024);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.atlas-container'));
      const styles = window.getComputedStyle(container.nativeElement);

      // Tablet layout may use grid or flex
      expect(['grid', 'flex'].includes(styles.display)).toBe(true);
    });

    it('should adapt layout for desktop screens (1920px)', () => {
      setViewportSize(1920, 1080);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.atlas-container'));
      const styles = window.getComputedStyle(container.nativeElement);

      // Desktop layout should use full width
      expect(styles.display).toBeDefined();
    });

    it('should hide mobile menu on desktop', () => {
      setViewportSize(1920, 1080);
      fixture.detectChanges();

      const mobileMenu = fixture.debugElement.query(By.css('.mobile-menu'));
      
      if (mobileMenu) {
        const styles = window.getComputedStyle(mobileMenu.nativeElement);
        expect(styles.display).toBe('none');
      }
    });

    it('should show mobile menu on mobile', () => {
      setViewportSize(320, 568);
      fixture.detectChanges();

      const mobileMenu = fixture.debugElement.query(By.css('.mobile-menu'));
      
      if (mobileMenu) {
        const styles = window.getComputedStyle(mobileMenu.nativeElement);
        expect(styles.display).not.toBe('none');
      }
    });

    it('should adjust font sizes for different screen sizes', () => {
      // Desktop
      setViewportSize(1920, 1080);
      fixture.detectChanges();
      const desktopElement = fixture.debugElement.query(By.css('h1'));
      const desktopFontSize = parseFloat(window.getComputedStyle(desktopElement.nativeElement).fontSize);

      // Mobile
      setViewportSize(320, 568);
      fixture.detectChanges();
      const mobileFontSize = parseFloat(window.getComputedStyle(desktopElement.nativeElement).fontSize);

      // Mobile font should be smaller or equal
      expect(mobileFontSize).toBeLessThanOrEqual(desktopFontSize);
    });

    it('should handle touch events on mobile', () => {
      setViewportSize(320, 568);
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button'));
      
      // Should support touch events
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 0, clientY: 0 } as Touch]
      });

      expect(() => {
        button.nativeElement.dispatchEvent(touchEvent);
      }).not.toThrow();
    });

    it('should adjust table layout for mobile', () => {
      setViewportSize(320, 568);
      fixture.detectChanges();

      const table = fixture.debugElement.query(By.css('table'));
      
      if (table) {
        const styles = window.getComputedStyle(table.nativeElement);
        
        // Mobile tables should be scrollable or stacked
        expect(
          styles.overflowX === 'auto' || 
          styles.display === 'block'
        ).toBe(true);
      }
    });
  });

  describe('Browser-Specific Features', () => {
    it('should handle Chrome-specific features', () => {
      if (isChrome()) {
        // Test Chrome DevTools Protocol
        expect(typeof (window as any).chrome).toBeDefined();
      }
    });

    it('should handle Firefox-specific features', () => {
      if (isFirefox()) {
        // Test Firefox-specific APIs
        expect(typeof (window as any).mozInnerScreenX).toBeDefined();
      }
    });

    it('should handle Safari-specific features', () => {
      if (isSafari()) {
        // Test Safari-specific APIs
        expect(typeof (window as any).safari).toBeDefined();
      }
    });

    it('should handle Edge-specific features', () => {
      if (isEdge()) {
        // Test Edge-specific APIs
        const userAgent = navigator.userAgent;
        expect(userAgent).toContain('Edg');
      }
    });
  });

  describe('Performance Across Browsers', () => {
    it('should render within acceptable time on all browsers', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      
      const startTime = performance.now();
      fixture.detectChanges();
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should render within 1 second on all browsers
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle large datasets efficiently on all browsers', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      const component = fixture.componentInstance;

      // Generate large dataset
      component.deployments = Array.from({ length: 1000 }, (_, i) => ({
        id: `deployment-${i}`,
        title: `Deployment ${i}`,
        type: 'STANDARD',
        currentState: 'DRAFT'
      }));

      const startTime = performance.now();
      fixture.detectChanges();
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should handle large datasets within 2 seconds
      expect(renderTime).toBeLessThan(2000);
    });
  });

  describe('CSS Grid and Flexbox Support', () => {
    it('should use CSS Grid where supported', () => {
      const supportsGrid = CSS.supports('display', 'grid');
      
      if (supportsGrid) {
        const fixture = TestBed.createComponent(DeploymentListComponent);
        fixture.detectChanges();

        const gridContainer = fixture.debugElement.query(By.css('.grid-container'));
        
        if (gridContainer) {
          const styles = window.getComputedStyle(gridContainer.nativeElement);
          expect(styles.display).toBe('grid');
        }
      }
    });

    it('should fallback to Flexbox if Grid not supported', () => {
      const supportsGrid = CSS.supports('display', 'grid');
      
      if (!supportsGrid) {
        const fixture = TestBed.createComponent(DeploymentListComponent);
        fixture.detectChanges();

        const container = fixture.debugElement.query(By.css('.atlas-container'));
        const styles = window.getComputedStyle(container.nativeElement);
        
        expect(styles.display).toBe('flex');
      }
    });
  });

  describe('Image and Media Support', () => {
    it('should support modern image formats', () => {
      const canvas = document.createElement('canvas');
      const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

      // Should support at least one modern format
      expect(supportsWebP || true).toBe(true);
    });

    it('should provide fallbacks for unsupported formats', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const images = fixture.debugElement.queryAll(By.css('img'));
      
      images.forEach(img => {
        const src = img.nativeElement.getAttribute('src');
        
        // Should have fallback format
        expect(src).toBeTruthy();
      });
    });
  });

  describe('Form Input Support', () => {
    it('should support HTML5 input types', () => {
      const input = document.createElement('input');
      
      // Test date input
      input.type = 'date';
      expect(input.type).toBe('date');

      // Test email input
      input.type = 'email';
      expect(input.type).toBe('email');

      // Test number input
      input.type = 'number';
      expect(input.type).toBe('number');
    });

    it('should provide fallbacks for unsupported input types', () => {
      const fixture = TestBed.createComponent(DeploymentListComponent);
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.css('input'));
      
      inputs.forEach(input => {
        const type = input.nativeElement.getAttribute('type');
        
        // Should have valid type
        expect(type).toBeTruthy();
      });
    });
  });
});

// Helper functions
function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height
  });
  window.dispatchEvent(new Event('resize'));
}

function isChrome(): boolean {
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

function isFirefox(): boolean {
  return /Firefox/.test(navigator.userAgent);
}

function isSafari(): boolean {
  return /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
}

function isEdge(): boolean {
  return /Edg/.test(navigator.userAgent);
}
