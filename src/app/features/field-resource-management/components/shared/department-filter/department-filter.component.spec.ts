import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedMaterialModule } from '../../../shared-material.module';
import { DepartmentFilterComponent } from './department-filter.component';

describe('DepartmentFilterComponent', () => {
  let component: DepartmentFilterComponent;
  let fixture: ComponentFixture<DepartmentFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DepartmentFilterComponent],
      imports: [
        SharedMaterialModule,
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DepartmentFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should default selected to All Departments', () => {
    expect(component.selected).toBe('All Departments');
  });

  it('should render All Departments as first option', () => {
    component.departments = ['Engineering', 'Marketing', 'Sales'];
    fixture.detectChanges();

    // Open the select panel
    const selectTrigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
    selectTrigger.click();
    fixture.detectChanges();

    // Get all options from the overlay
    const options = document.querySelectorAll('mat-option');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent?.trim()).toBe('All Departments');
  });

  it('should render all department inputs as options after All Departments', () => {
    const departments = ['Engineering', 'Marketing', 'Sales'];
    component.departments = departments;
    fixture.detectChanges();

    // Open the select panel
    const selectTrigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
    selectTrigger.click();
    fixture.detectChanges();

    const options = document.querySelectorAll('mat-option');
    // First option is "All Departments", followed by the department list
    expect(options.length).toBe(departments.length + 1);
    expect(options[1].textContent?.trim()).toBe('Engineering');
    expect(options[2].textContent?.trim()).toBe('Marketing');
    expect(options[3].textContent?.trim()).toBe('Sales');
  });

  it('should emit departmentChange when selection changes', () => {
    spyOn(component.departmentChange, 'emit');

    component.onSelectionChange('Engineering');

    expect(component.departmentChange.emit).toHaveBeenCalledWith('Engineering');
  });

  it('should update when departments input changes', () => {
    // Initially no departments
    expect(component.departments.length).toBe(0);

    // Update departments input
    component.departments = ['Finance', 'Operations'];
    fixture.detectChanges();

    // Open the select panel
    const selectTrigger = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
    selectTrigger.click();
    fixture.detectChanges();

    const options = document.querySelectorAll('mat-option');
    // "All Departments" + 2 departments
    expect(options.length).toBe(3);
    expect(options[1].textContent?.trim()).toBe('Finance');
    expect(options[2].textContent?.trim()).toBe('Operations');
  });
});
