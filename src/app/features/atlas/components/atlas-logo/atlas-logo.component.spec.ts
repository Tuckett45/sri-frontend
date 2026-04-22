import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AtlasLogoComponent } from './atlas-logo.component';

describe('AtlasLogoComponent', () => {
  let component: AtlasLogoComponent;
  let fixture: ComponentFixture<AtlasLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtlasLogoComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AtlasLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default size of medium', () => {
    expect(component.size).toBe('medium');
  });

  it('should have default theme of auto', () => {
    expect(component.theme).toBe('auto');
  });

  it('should have default routerLink of /atlas', () => {
    expect(component.routerLink).toBe('/atlas');
  });

  it('should return correct logo source for light theme', () => {
    component.theme = 'light';
    expect(component.logoSrc).toBe('assets/images/atlas/atlas-logo-light.png');
  });

  it('should return correct logo source for dark theme', () => {
    component.theme = 'dark';
    expect(component.logoSrc).toBe('assets/images/atlas/atlas-logo-dark.png');
  });

  it('should generate correct CSS classes', () => {
    component.size = 'large';
    expect(component.logoClasses).toBe('atlas-logo atlas-logo-large');
  });

  it('should have accessible alt text', () => {
    expect(component.altText).toContain('ATLAS');
    expect(component.altText).toContain('Advanced Technology Logistics and Automation System');
  });
});
