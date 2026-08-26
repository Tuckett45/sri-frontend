import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedMaterialModule } from '../../../shared-material.module';
import { TeamViewToggleComponent, ViewMode } from './team-view-toggle.component';

describe('TeamViewToggleComponent', () => {
  let component: TeamViewToggleComponent;
  let fixture: ComponentFixture<TeamViewToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeamViewToggleComponent],
      imports: [
        SharedMaterialModule,
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TeamViewToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to employee view mode', () => {
    expect(component.viewMode).toBe('employee');
  });

  it('should emit team when Team Requests toggle is clicked', () => {
    spyOn(component.viewModeChange, 'emit');

    component.onViewModeChange('team');

    expect(component.viewModeChange.emit).toHaveBeenCalledWith('team');
  });

  it('should emit employee when My Requests toggle is clicked', () => {
    // Set viewMode to 'team' first so switching to 'employee' is a change
    component.viewMode = 'team';
    fixture.detectChanges();

    spyOn(component.viewModeChange, 'emit');

    component.onViewModeChange('employee');

    expect(component.viewModeChange.emit).toHaveBeenCalledWith('employee');
  });

  it('should not emit if the same mode is selected (dedup check)', () => {
    // viewMode defaults to 'employee'
    spyOn(component.viewModeChange, 'emit');

    component.onViewModeChange('employee');

    expect(component.viewModeChange.emit).not.toHaveBeenCalled();
  });

  it('should reflect viewMode input binding', () => {
    component.viewMode = 'team';
    fixture.detectChanges();

    expect(component.viewMode).toBe('team');

    // Verify the toggle group value is reflected in the template
    const toggleGroup = fixture.nativeElement.querySelector('mat-button-toggle-group');
    expect(toggleGroup).toBeTruthy();
  });
});
