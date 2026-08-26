import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * Department Filter Component
 *
 * A reusable dropdown component that allows filtering by department.
 * Always includes "All Departments" as the first option, followed by
 * the provided sorted department list.
 *
 * @example
 * <frm-department-filter
 *   [departments]="departmentOptions"
 *   [selected]="selectedDepartment"
 *   (departmentChange)="onDepartmentChange($event)">
 * </frm-department-filter>
 */
@Component({
  selector: 'frm-department-filter',
  templateUrl: './department-filter.component.html',
  styleUrls: ['./department-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentFilterComponent {
  /** Sorted list of department names to display as filter options */
  @Input() departments: string[] = [];

  /** Currently selected department (default "All Departments") */
  @Input() selected: string = 'All Departments';

  /** Emits the selected department string when the selection changes */
  @Output() departmentChange = new EventEmitter<string>();

  /** The default option that is always shown first */
  readonly allDepartmentsOption = 'All Departments';

  /**
   * Handle selection change from the mat-select dropdown.
   * Emits the new department value to the parent component.
   */
  onSelectionChange(department: string): void {
    this.departmentChange.emit(department);
  }
}
