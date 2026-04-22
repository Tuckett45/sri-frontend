import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapViewComponent } from './map-view.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('MapViewComponent', () => {
  let component: MapViewComponent;
  let fixture: ComponentFixture<MapViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapViewComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default filters', () => {
    expect(component.currentFilters.showTechnicians).toBe(true);
    expect(component.currentFilters.showCrews).toBe(true);
    expect(component.currentFilters.showJobs).toBe(true);
  });

  it('should toggle filters visibility', () => {
    const initialState = component.showFilters;
    component.toggleFilters();
    expect(component.showFilters).toBe(!initialState);
  });

  it('should toggle legend visibility', () => {
    const initialState = component.showLegend;
    component.toggleLegend();
    expect(component.showLegend).toBe(!initialState);
  });

  it('should update filters when changed', () => {
    const newFilters = {
      ...component.currentFilters,
      showTechnicians: false
    };
    
    component.onFiltersChanged(newFilters);
    expect(component.currentFilters.showTechnicians).toBe(false);
  });
});
