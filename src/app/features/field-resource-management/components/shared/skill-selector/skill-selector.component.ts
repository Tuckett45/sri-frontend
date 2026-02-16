import { Component, Input, forwardRef, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Skill } from '../../../models/technician.model';

/**
 * Skill Selector Component
 * 
 * A reusable multi-select component for selecting skills with autocomplete functionality.
 * Implements ControlValueAccessor for seamless integration with Angular forms.
 * 
 * Features:
 * - Multi-select dropdown with Material Design
 * - Autocomplete with filtering
 * - Selected skills displayed as removable chips
 * - Form control integration
 * 
 * @example
 * <frm-skill-selector
 *   [availableSkills]="skills"
 *   formControlName="requiredSkills">
 * </frm-skill-selector>
 */
@Component({
  selector: 'frm-skill-selector',
  templateUrl: './skill-selector.component.html',
  styleUrls: ['./skill-selector.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SkillSelectorComponent),
      multi: true
    }
  ]
})
export class SkillSelectorComponent implements ControlValueAccessor, OnInit {
  @Input() availableSkills: Skill[] = [];
  @Input() placeholder: string = 'Select skills';
  @Input() label: string = 'Skills';

  selectedSkills: Skill[] = [];
  skillControl = new FormControl('');
  filteredSkills$: Observable<Skill[]> = of([]);
  
  private onChange: (value: Skill[]) => void = () => {};
  onTouched: () => void = () => {};
  disabled = false;

  ngOnInit(): void {
    this.filteredSkills$ = this.skillControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterSkills(value || ''))
    );
  }

  /**
   * Filter skills based on search input
   */
  private _filterSkills(value: string): Skill[] {
    const filterValue = value.toLowerCase();
    return this.availableSkills.filter(skill => 
      !this.selectedSkills.find(s => s.id === skill.id) &&
      (skill.name.toLowerCase().includes(filterValue) || 
       skill.category.toLowerCase().includes(filterValue))
    );
  }

  /**
   * Add skill to selection
   */
  addSkill(skill: Skill): void {
    if (!this.selectedSkills.find(s => s.id === skill.id)) {
      this.selectedSkills = [...this.selectedSkills, skill];
      this.skillControl.setValue('');
      this.onChange(this.selectedSkills);
      this.onTouched();
    }
  }

  /**
   * Remove skill from selection
   */
  removeSkill(skill: Skill): void {
    this.selectedSkills = this.selectedSkills.filter(s => s.id !== skill.id);
    this.onChange(this.selectedSkills);
    this.onTouched();
  }

  /**
   * Display function for autocomplete
   */
  displayFn(skill: Skill | null): string {
    return skill ? skill.name : '';
  }

  /**
   * Handle option selection from autocomplete
   */
  onOptionSelected(skill: Skill): void {
    this.addSkill(skill);
  }

  // ControlValueAccessor implementation
  writeValue(value: Skill[]): void {
    this.selectedSkills = value || [];
  }

  registerOnChange(fn: (value: Skill[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.skillControl.disable();
    } else {
      this.skillControl.enable();
    }
  }
}
