import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KPICardComponent } from './kpi-card.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { KPI, Trend, KPIStatus } from '../../../models/reporting.model';

describe('KPICardComponent', () => {
  let component: KPICardComponent;
  let fixture: ComponentFixture<KPICardComponent>;

  const mockKPI: KPI = {
    name: 'Jobs Assigned',
    value: 95,
    target: 100,
    unit: '%',
    trend: Trend.Up,
    status: KPIStatus.OnTrack
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KPICardComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(KPICardComponent);
    component = fixture.componentInstance;
    component.kpi = mockKPI;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display KPI name', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.kpi-name').textContent).toContain('Jobs Assigned');
  });

  it('should get correct trend icon', () => {
    expect(component.getTrendIcon()).toBe('trending_up');
    
    component.kpi.trend = Trend.Down;
    expect(component.getTrendIcon()).toBe('trending_down');
    
    component.kpi.trend = Trend.Stable;
    expect(component.getTrendIcon()).toBe('trending_flat');
  });

  it('should get correct trend color', () => {
    expect(component.getTrendColor()).toBe('trend-up');
    
    component.kpi.trend = Trend.Down;
    expect(component.getTrendColor()).toBe('trend-down');
    
    component.kpi.trend = Trend.Stable;
    expect(component.getTrendColor()).toBe('trend-stable');
  });

  it('should get correct status color', () => {
    expect(component.getStatusColor()).toBe('status-on-track');
    
    component.kpi.status = KPIStatus.AtRisk;
    expect(component.getStatusColor()).toBe('status-at-risk');
    
    component.kpi.status = KPIStatus.BelowTarget;
    expect(component.getStatusColor()).toBe('status-below-target');
  });

  it('should get correct status label', () => {
    expect(component.getStatusLabel()).toBe('On Track');
    
    component.kpi.status = KPIStatus.AtRisk;
    expect(component.getStatusLabel()).toBe('At Risk');
    
    component.kpi.status = KPIStatus.BelowTarget;
    expect(component.getStatusLabel()).toBe('Below Target');
  });

  it('should calculate progress percentage correctly', () => {
    expect(component.getProgressPercentage()).toBe(95);
    
    component.kpi.value = 50;
    component.kpi.target = 100;
    expect(component.getProgressPercentage()).toBe(50);
    
    component.kpi.value = 120;
    component.kpi.target = 100;
    expect(component.getProgressPercentage()).toBe(100); // Capped at 100
  });

  it('should handle zero target', () => {
    component.kpi.target = 0;
    expect(component.getProgressPercentage()).toBe(0);
  });

  it('should generate sparkline data', () => {
    const sparklineData = component.getSparklineData();
    expect(sparklineData.length).toBeGreaterThan(0);
    expect(sparklineData[sparklineData.length - 1]).toBe(component.kpi.value);
  });
});
