import { Component, Input, forwardRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Skill, SkillLevel } from '../../../models/technician.model';

/**
 * Skill Selector Component
 * 
 * A reusable multi-select component for selecting skills with proficiency levels.
 * Implements ControlValueAccessor for seamless integration with Angular forms.
 * 
 * Features:
 * - Multi-select dropdown with Material Design
 * - Autocomplete with filtering
 * - Proficiency level selection (Beginner, Intermediate, Advanced, Expert)
 * - Selected skills displayed as removable chips with level badges
 * - Form control integration
 * - Accessibility support (ARIA labels, keyboard navigation)
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkillSelectorComponent implements ControlValueAccessor, OnInit {
  @Input() availableSkills: Skill[] = [];
  @Input() placeholder: string = 'Select skills';
  @Input() label: string = 'Skills';
  @Input() showLevelSelector: boolean = true;

  selectedSkills: Skill[] = [];
  skillControl = new FormControl('');
  filteredSkills$: Observable<Skill[]> = of([]);
  
  // Expose SkillLevel enum to template
  readonly skillLevels = Object.values(SkillLevel);
  readonly SkillLevel = SkillLevel;
  
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
   * Excludes already selected skills from the list
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
   * Add skill to selection with default proficiency level
   */
  addSkill(skill: Skill): void {
    if (!this.selectedSkills.find(s => s.id === skill.id)) {
      // Add skill with default level (Beginner)
      const skillWithLevel: Skill = {
        ...skill,
        level: skill.level || SkillLevel.Beginner
      };
      this.selectedSkills = [...this.selectedSkills, skillWithLevel];
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
   * Update skill proficiency level
   */
  updateSkillLevel(skill: Skill, level: SkillLevel): void {
    const index = this.selectedSkills.findIndex(s => s.id === skill.id);
    if (index !== -1) {
      const updatedSkills = [...this.selectedSkills];
      updatedSkills[index] = { ...updatedSkills[index], level };
      this.selectedSkills = updatedSkills;
      this.onChange(this.selectedSkills);
      this.onTouched();
    }
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

  /**
   * Get display label for skill level
   */
  getSkillLevelLabel(level: SkillLevel): string {
    switch (level) {
      case SkillLevel.Beginner:
        return 'Beginner';
      case SkillLevel.Intermediate:
        return 'Intermediate';
      case SkillLevel.Advanced:
        return 'Advanced';
      case SkillLevel.Expert:
        return 'Expert';
      default:
        return level;
    }
  }

  /**
   * Get CSS class for skill level badge
   */
  getSkillLevelClass(level: SkillLevel): string {
    return `skill-level--${level.toLowerCase()}`;
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
