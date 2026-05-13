import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapFiltersComponent } from './map-filters.component';

describe('MapFiltersComponent', () => {
  let component: MapFiltersComponent;
  let fixture: ComponentFixture<MapFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapFiltersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default filters enabled', () => {
    expect(component.filters.showTechnicians).toBe(true);
    expect(component.filters.showCrews).toBe(true);
    expect(component.filters.showJobs).toBe(true);
  });

  it('should toggle entity type visibility', () => {
    component.toggleEntityType('technicians');
    expect(component.filters.showTechnicians).toBe(false);
    
    component.toggleEntityType('technicians');
    expect(component.filters.showTechnicians).toBe(true);
  });

  it('should emit filters when changed', (done) => {
    component.filtersChanged.subscribe(filters => {
      expect(filters.showTechnicians).toBe(false);
      done();
    });
    
    component.toggleEntityType('technicians');
  });

  it('should reset filters to default', () => {
    component.filters.showTechnicians = false;
    component.filters.technicianStatuses = [];
    
    component.resetFilters();
    
    expect(component.filters.showTechnicians).toBe(true);
    expect(component.filters.technicianStatuses.length).toBeGreaterThan(0);
  });
});
