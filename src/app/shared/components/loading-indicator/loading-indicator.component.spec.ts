import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingIndicatorComponent } from './loading-indicator.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('LoadingIndicatorComponent', () => {
  let component: LoadingIndicatorComponent;
  let fixture: ComponentFixture<LoadingIndicatorComponent>;
  let compiled: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoadingIndicatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingIndicatorComponent);
    component = fixture.componentInstance;
    compiled = fixture.debugElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Spinner mode', () => {
    beforeEach(() => {
      component.mode = 'spinner';
      fixture.detectChanges();
    });

    it('should display spinner', () => {
      const spinner = compiled.query(By.css('.spinner-container'));
      expect(spinner).toBeTruthy();
    });

    it('should apply correct size class', () => {
      component.size = 'large';
      fixture.detectChanges();
      const container = compiled.query(By.css('.spinner-large'));
      expect(container).toBeTruthy();
    });

    it('should display message when provided', () => {
      component.message = 'Loading data...';
      fixture.detectChanges();
      const message = compiled.query(By.css('.loading-message'));
      expect(message.nativeElement.textContent).toContain('Loading data...');
    });

    it('should have accessibility attributes', () => {
      const spinner = compiled.query(By.css('.spinner'));
      expect(spinner.nativeElement.getAttribute('role')).toBe('status');
      expect(spinner.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Progress bar mode', () => {
    beforeEach(() => {
      component.mode = 'progress';
      component.progress = 50;
      fixture.detectChanges();
    });

    it('should display progress bar', () => {
      const progressBar = compiled.query(By.css('.progress-bar'));
      expect(progressBar).toBeTruthy();
    });

    it('should set correct progress width', () => {
      const progressFill = compiled.query(By.css('.progress-fill'));
      expect(progressFill.nativeElement.style.width).toBe('50%');
    });

    it('should display progress percentage', () => {
      const percentage = compiled.query(By.css('.progress-percentage'));
      expect(percentage.nativeElement.textContent).toContain('50%');
    });

    it('should have ARIA attributes', () => {
      const progressBar = compiled.query(By.css('.progress-bar'));
      expect(progressBar.nativeElement.getAttribute('role')).toBe('progressbar');
      expect(progressBar.nativeElement.getAttribute('aria-valuenow')).toBe('50');
      expect(progressBar.nativeElement.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar.nativeElement.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should update progress dynamically', () => {
      component.progress = 75;
      fixture.detectChanges();
      const progressFill = compiled.query(By.css('.progress-fill'));
      expect(progressFill.nativeElement.style.width).toBe('75%');
    });
  });

  describe('Skeleton mode', () => {
    beforeEach(() => {
      component.mode = 'skeleton';
      component.skeletonLines = 3;
      fixture.detectChanges();
    });

    it('should display skeleton lines', () => {
      const skeletonLines = compiled.queryAll(By.css('.skeleton-line'));
      expect(skeletonLines.length).toBe(3);
    });

    it('should render correct number of lines', () => {
      component.skeletonLines = 5;
      fixture.detectChanges();
      const skeletonLines = compiled.queryAll(By.css('.skeleton-line'));
      expect(skeletonLines.length).toBe(5);
    });

    it('should have accessibility attributes', () => {
      const skeletonLine = compiled.query(By.css('.skeleton-line'));
      expect(skeletonLine.nativeElement.getAttribute('role')).toBe('status');
    });
  });

  describe('Overlay mode', () => {
    it('should display as overlay when overlay is true', () => {
      component.overlay = true;
      fixture.detectChanges();
      const overlay = compiled.query(By.css('.loading-overlay'));
      expect(overlay).toBeTruthy();
    });

    it('should display inline when overlay is false', () => {
      component.overlay = false;
      fixture.detectChanges();
      const inline = compiled.query(By.css('.loading-inline'));
      expect(inline).toBeTruthy();
    });
  });
});
