import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HealthDashboardComponent } from './health-dashboard.component';
import { AtlasHealthService, HealthStatus } from '../../services/atlas-health.service';

describe('HealthDashboardComponent', () => {
  let component: HealthDashboardComponent;
  let fixture: ComponentFixture<HealthDashboardComponent>;
  let healthService: jasmine.SpyObj<AtlasHealthService>;

  const mockHealthStatus = {
    overallStatus: HealthStatus.HEALTHY,
    services: [
      {
        serviceName: 'Deployments',
        status: HealthStatus.HEALTHY,
        responseTimeMs: 100,
        lastChecked: new Date()
      },
      {
        serviceName: 'AI Analysis',
        status: HealthStatus.HEALTHY,
        responseTimeMs: 150,
        lastChecked: new Date()
      }
    ],
    lastUpdated: new Date()
  };

  beforeEach(async () => {
    const healthServiceSpy = jasmine.createSpyObj('AtlasHealthService', [
      'getHealthStatus',
      'startHealthChecks',
      'performHealthCheck',
      'getHealthyServiceCount',
      'getAverageResponseTime'
    ]);

    healthServiceSpy.getHealthStatus.and.returnValue(of(mockHealthStatus));
    healthServiceSpy.performHealthCheck.and.returnValue(of(mockHealthStatus));
    healthServiceSpy.getHealthyServiceCount.and.returnValue(2);
    healthServiceSpy.getAverageResponseTime.and.returnValue(125);

    await TestBed.configureTestingModule({
      imports: [HealthDashboardComponent],
      providers: [
        { provide: AtlasHealthService, useValue: healthServiceSpy }
      ]
    }).compileComponents();

    healthService = TestBed.inject(AtlasHealthService) as jasmine.SpyObj<AtlasHealthService>;
    fixture = TestBed.createComponent(HealthDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load health status on init', () => {
    fixture.detectChanges();
    
    expect(healthService.getHealthStatus).toHaveBeenCalled();
    expect(healthService.startHealthChecks).toHaveBeenCalled();
    expect(component.healthStatus).toEqual(mockHealthStatus);
  });

  it('should refresh health status when refresh button clicked', () => {
    fixture.detectChanges();
    
    component.refreshHealth();
    
    expect(healthService.performHealthCheck).toHaveBeenCalled();
  });

  it('should display overall status', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const statusElement = compiled.querySelector('.overall-status');
    
    expect(statusElement).toBeTruthy();
    expect(statusElement.textContent).toContain('HEALTHY');
  });

  it('should display service cards', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const serviceCards = compiled.querySelectorAll('.service-card');
    
    expect(serviceCards.length).toBe(2);
  });

  it('should calculate healthy count correctly', () => {
    fixture.detectChanges();
    
    expect(component.getHealthyCount()).toBe(2);
  });

  it('should calculate total count correctly', () => {
    fixture.detectChanges();
    
    expect(component.getTotalCount()).toBe(2);
  });

  it('should calculate average response time correctly', () => {
    fixture.detectChanges();
    
    expect(component.getAvgResponseTime()).toBe(125);
  });
});
