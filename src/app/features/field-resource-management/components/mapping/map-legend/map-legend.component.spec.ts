import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapLegendComponent } from './map-legend.component';

describe('MapLegendComponent', () => {
  let component: MapLegendComponent;
  let fixture: ComponentFixture<MapLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapLegendComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have legend items defined', () => {
    expect(component.technicianLegend.length).toBeGreaterThan(0);
    expect(component.crewLegend.length).toBeGreaterThan(0);
    expect(component.jobLegend.length).toBeGreaterThan(0);
    expect(component.priorityLegend.length).toBeGreaterThan(0);
  });

  it('should toggle collapsed state', () => {
    const initialState = component.isCollapsed;
    component.toggleCollapsed();
    expect(component.isCollapsed).toBe(!initialState);
  });
});
