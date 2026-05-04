import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SkillSelectorComponent } from './skill-selector.component';
import { Skill, SkillLevel } from '../../../models/technician.model';

describe('SkillSelectorComponent', () => {
  let component: SkillSelectorComponent;
  let fixture: ComponentFixture<SkillSelectorComponent>;

  const mockSkills: Skill[] = [
    {
      id: '1',
      name: 'Fiber Splicing',
      category: 'Technical',
      level: SkillLevel.Beginner,
      verifiedDate: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Cable Installation',
      category: 'Technical',
      level: SkillLevel.Intermediate,
      verifiedDate: new Date('2024-01-01')
    },
    {
      id: '3',
      name: 'Network Testing',
      category: 'Technical',
      level: SkillLevel.Advanced,
      verifiedDate: new Date('2024-01-01')
    },
    {
      id: '4',
      name: 'Project Management',
      category: 'Management',
      level: SkillLevel.Expert,
      verifiedDate: new Date('2024-01-01')
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SkillSelectorComponent],
      imports: [
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatChipsModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SkillSelectorComponent);
    component = fixture.componentInstance;
    component.availableSkills = mockSkills;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty selected skills', () => {
      fixture.detectChanges();
      expect(component.selectedSkills).toEqual([]);
    });

    it('should initialize with default placeholder', () => {
      fixture.detectChanges();
      expect(component.placeholder).toBe('Select skills');
    });

    it('should initialize with default label', () => {
      fixture.detectChanges();
      expect(component.label).toBe('Skills');
    });

    it('should initialize with showLevelSelector as true', () => {
      fixture.detectChanges();
      expect(component.showLevelSelector).toBe(true);
    });

    it('should initialize as not disabled', () => {
      fixture.detectChanges();
      expect(component.disabled).toBe(false);
    });

    it('should initialize filteredSkills$ observable', (done) => {
      component.ngOnInit();
      fixture.detectChanges();

      component.filteredSkills$.subscribe(skills => {
        expect(skills).toEqual(mockSkills);
        done();
      });
    });

    it('should expose SkillLevel enum values', () => {
      expect(component.skillLevels).toEqual([
        SkillLevel.Beginner,
        SkillLevel.Intermediate,
        SkillLevel.Advanced,
        SkillLevel.Expert
      ]);
    });
  });

  describe('Skill Filtering', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should filter skills by name', (done) => {
      component.skillControl.setValue('Fiber');

      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(1);
        expect(skills[0].name).toBe('Fiber Splicing');
        done();
      });
    });

    it('should filter skills by category', (done) => {
      component.skillControl.setValue('Management');

      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(1);
        expect(skills[0].name).toBe('Project Management');
        done();
      });
    });

    it('should be case insensitive', (done) => {
      component.skillControl.setValue('FIBER');

      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(1);
        expect(skills[0].name).toBe('Fiber Splicing');
        done();
      });
    });

    it('should exclude already selected skills from filtered list', (done) => {
      component.selectedSkills = [mockSkills[0]];
      component.skillControl.setValue('');

      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(3);
        expect(skills.find(s => s.id === '1')).toBeUndefined();
        done();
      });
    });

    it('should return all available skills when search is empty', (done) => {
      component.skillControl.setValue('');

      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(4);
        done();
      });
    });

    it('should return empty array when no skills match', (done) => {
      component.skillControl.setValue('NonExistentSkill');

      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(0);
        done();
      });
    });
  });

  describe('Adding Skills', () => {
    it('should add skill to selected skills', () => {
      const skill = mockSkills[0];
      component.addSkill(skill);

      expect(component.selectedSkills.length).toBe(1);
      expect(component.selectedSkills[0].id).toBe(skill.id);
    });

    it('should add skill with default Beginner level if no level provided', () => {
      const skillWithoutLevel = { ...mockSkills[0], level: undefined as any };
      component.addSkill(skillWithoutLevel);

      expect(component.selectedSkills[0].level).toBe(SkillLevel.Beginner);
    });

    it('should preserve existing level when adding skill', () => {
      const skill = mockSkills[2]; // Advanced level
      component.addSkill(skill);

      expect(component.selectedSkills[0].level).toBe(SkillLevel.Advanced);
    });

    it('should clear skill control after adding', () => {
      component.skillControl.setValue('test');
      component.addSkill(mockSkills[0]);

      expect(component.skillControl.value).toBe('');
    });

    it('should call onChange callback when adding skill', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);

      component.addSkill(mockSkills[0]);

      expect(onChangeSpy).toHaveBeenCalledWith(component.selectedSkills);
    });

    it('should call onTouched callback when adding skill', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);

      component.addSkill(mockSkills[0]);

      expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should not add duplicate skills', () => {
      component.addSkill(mockSkills[0]);
      component.addSkill(mockSkills[0]);

      expect(component.selectedSkills.length).toBe(1);
    });

    it('should add multiple different skills', () => {
      component.addSkill(mockSkills[0]);
      component.addSkill(mockSkills[1]);
      component.addSkill(mockSkills[2]);

      expect(component.selectedSkills.length).toBe(3);
    });
  });

  describe('Removing Skills', () => {
    beforeEach(() => {
      component.selectedSkills = [mockSkills[0], mockSkills[1]];
    });

    it('should remove skill from selected skills', () => {
      component.removeSkill(mockSkills[0]);

      expect(component.selectedSkills.length).toBe(1);
      expect(component.selectedSkills[0].id).toBe(mockSkills[1].id);
    });

    it('should call onChange callback when removing skill', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);

      component.removeSkill(mockSkills[0]);

      expect(onChangeSpy).toHaveBeenCalledWith(component.selectedSkills);
    });

    it('should call onTouched callback when removing skill', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);

      component.removeSkill(mockSkills[0]);

      expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should handle removing non-existent skill gracefully', () => {
      const initialLength = component.selectedSkills.length;
      component.removeSkill(mockSkills[3]);

      expect(component.selectedSkills.length).toBe(initialLength);
    });

    it('should remove all skills when called multiple times', () => {
      component.removeSkill(mockSkills[0]);
      component.removeSkill(mockSkills[1]);

      expect(component.selectedSkills.length).toBe(0);
    });
  });

  describe('Updating Skill Levels', () => {
    beforeEach(() => {
      component.selectedSkills = [
        { ...mockSkills[0], level: SkillLevel.Beginner }
      ];
    });

    it('should update skill level', () => {
      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Advanced);

      expect(component.selectedSkills[0].level).toBe(SkillLevel.Advanced);
    });

    it('should call onChange callback when updating level', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);

      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Expert);

      expect(onChangeSpy).toHaveBeenCalledWith(component.selectedSkills);
    });

    it('should call onTouched callback when updating level', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);

      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Expert);

      expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should not modify other skills when updating one skill level', () => {
      component.selectedSkills = [
        { ...mockSkills[0], level: SkillLevel.Beginner },
        { ...mockSkills[1], level: SkillLevel.Intermediate }
      ];

      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Advanced);

      expect(component.selectedSkills[0].level).toBe(SkillLevel.Advanced);
      expect(component.selectedSkills[1].level).toBe(SkillLevel.Intermediate);
    });

    it('should handle updating non-existent skill gracefully', () => {
      const nonExistentSkill = { ...mockSkills[3] };
      const initialSkills = [...component.selectedSkills];

      component.updateSkillLevel(nonExistentSkill, SkillLevel.Expert);

      expect(component.selectedSkills).toEqual(initialSkills);
    });

    it('should create new array reference when updating level', () => {
      const originalArray = component.selectedSkills;

      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Expert);

      expect(component.selectedSkills).not.toBe(originalArray);
    });
  });

  describe('Skill Level Display', () => {
    it('should return correct label for Beginner', () => {
      expect(component.getSkillLevelLabel(SkillLevel.Beginner)).toBe('Beginner');
    });

    it('should return correct label for Intermediate', () => {
      expect(component.getSkillLevelLabel(SkillLevel.Intermediate)).toBe('Intermediate');
    });

    it('should return correct label for Advanced', () => {
      expect(component.getSkillLevelLabel(SkillLevel.Advanced)).toBe('Advanced');
    });

    it('should return correct label for Expert', () => {
      expect(component.getSkillLevelLabel(SkillLevel.Expert)).toBe('Expert');
    });

    it('should return level value for unknown level', () => {
      const unknownLevel = 'UNKNOWN' as SkillLevel;
      expect(component.getSkillLevelLabel(unknownLevel)).toBe('UNKNOWN');
    });

    it('should return correct CSS class for Beginner', () => {
      expect(component.getSkillLevelClass(SkillLevel.Beginner)).toBe('skill-level--beginner');
    });

    it('should return correct CSS class for Intermediate', () => {
      expect(component.getSkillLevelClass(SkillLevel.Intermediate)).toBe('skill-level--intermediate');
    });

    it('should return correct CSS class for Advanced', () => {
      expect(component.getSkillLevelClass(SkillLevel.Advanced)).toBe('skill-level--advanced');
    });

    it('should return correct CSS class for Expert', () => {
      expect(component.getSkillLevelClass(SkillLevel.Expert)).toBe('skill-level--expert');
    });
  });

  describe('Autocomplete', () => {
    it('should return skill name for displayFn', () => {
      const skill = mockSkills[0];
      expect(component.displayFn(skill)).toBe('Fiber Splicing');
    });

    it('should return empty string for null skill in displayFn', () => {
      expect(component.displayFn(null)).toBe('');
    });

    it('should add skill when option is selected', () => {
      component.onOptionSelected(mockSkills[0]);

      expect(component.selectedSkills.length).toBe(1);
      expect(component.selectedSkills[0].id).toBe(mockSkills[0].id);
    });
  });

  describe('ControlValueAccessor Implementation', () => {
    it('should write value to component', () => {
      const skills = [mockSkills[0], mockSkills[1]];
      component.writeValue(skills);

      expect(component.selectedSkills).toEqual(skills);
    });

    it('should handle null value in writeValue', () => {
      component.selectedSkills = [mockSkills[0]];
      component.writeValue(null as any);

      expect(component.selectedSkills).toEqual([]);
    });

    it('should register onChange callback', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);

      expect(component['onChange']).toBe(onChangeSpy);
    });

    it('should register onTouched callback', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);

      expect(component['onTouched']).toBe(onTouchedSpy);
    });

    it('should disable component when setDisabledState is called with true', () => {
      component.setDisabledState(true);

      expect(component.disabled).toBe(true);
      expect(component.skillControl.disabled).toBe(true);
    });

    it('should enable component when setDisabledState is called with false', () => {
      component.setDisabledState(true);
      component.setDisabledState(false);

      expect(component.disabled).toBe(false);
      expect(component.skillControl.disabled).toBe(false);
    });
  });

  describe('Component Rendering', () => {
    it('should render mat-form-field', () => {
      fixture.detectChanges();
      const formField = fixture.nativeElement.querySelector('mat-form-field');
      expect(formField).toBeTruthy();
    });

    it('should render mat-chip-grid', () => {
      fixture.detectChanges();
      const chipGrid = fixture.nativeElement.querySelector('mat-chip-grid');
      expect(chipGrid).toBeTruthy();
    });

    it('should render input with autocomplete', () => {
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input[matAutocomplete]');
      expect(input).toBeTruthy();
    });

    it('should render skill chips for selected skills', () => {
      component.selectedSkills = [mockSkills[0], mockSkills[1]];
      fixture.detectChanges();

      const chips = fixture.nativeElement.querySelectorAll('mat-chip-row');
      expect(chips.length).toBe(2);
    });

    it('should render proficiency level section when skills are selected', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const levelSection = fixture.nativeElement.querySelector('.skill-levels');
      expect(levelSection).toBeTruthy();
    });

    it('should not render proficiency level section when no skills selected', () => {
      component.selectedSkills = [];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const levelSection = fixture.nativeElement.querySelector('.skill-levels');
      expect(levelSection).toBeFalsy();
    });

    it('should not render proficiency level section when showLevelSelector is false', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = false;
      fixture.detectChanges();

      const levelSection = fixture.nativeElement.querySelector('.skill-levels');
      expect(levelSection).toBeFalsy();
    });

    it('should render level selector for each selected skill', () => {
      component.selectedSkills = [mockSkills[0], mockSkills[1]];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const levelItems = fixture.nativeElement.querySelectorAll('.skill-level-item');
      expect(levelItems.length).toBe(2);
    });

    it('should display skill name in chip', () => {
      component.selectedSkills = [mockSkills[0]];
      fixture.detectChanges();

      const chipName = fixture.nativeElement.querySelector('.skill-chip__name');
      expect(chipName.textContent.trim()).toBe('Fiber Splicing');
    });

    it('should display skill level badge in chip when showLevelSelector is true', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const levelBadge = fixture.nativeElement.querySelector('.skill-chip__level');
      expect(levelBadge).toBeTruthy();
    });

    it('should not display skill level badge when showLevelSelector is false', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = false;
      fixture.detectChanges();

      const levelBadge = fixture.nativeElement.querySelector('.skill-chip__level');
      expect(levelBadge).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on chip grid', () => {
      fixture.detectChanges();
      const chipGrid = fixture.nativeElement.querySelector('mat-chip-grid');
      expect(chipGrid.getAttribute('aria-label')).toBe('Skill selection');
    });

    it('should have aria-label on input', () => {
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('aria-label')).toBe('Search and select skills');
    });

    it('should have aria-label on remove buttons', () => {
      component.selectedSkills = [mockSkills[0]];
      fixture.detectChanges();

      const removeButton = fixture.nativeElement.querySelector('button[matChipRemove]');
      expect(removeButton.getAttribute('aria-label')).toBe('Remove Fiber Splicing');
    });

    it('should have aria-label on level badge', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const levelBadge = fixture.nativeElement.querySelector('.skill-chip__level');
      expect(levelBadge.getAttribute('aria-label')).toContain('Proficiency level:');
    });

    it('should have role and aria-label on proficiency levels section', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const levelSection = fixture.nativeElement.querySelector('.skill-levels');
      expect(levelSection.getAttribute('role')).toBe('region');
      expect(levelSection.getAttribute('aria-label')).toBe('Skill proficiency levels');
    });

    it('should have proper label association for level selectors', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.skill-level-item__label');
      const select = fixture.nativeElement.querySelector('mat-select');
      
      expect(label.getAttribute('for')).toBe('skill-level-1');
      expect(select.getAttribute('id')).toBe('skill-level-1');
    });

    it('should have aria-label on level selectors', () => {
      component.selectedSkills = [mockSkills[0]];
      component.showLevelSelector = true;
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('mat-select');
      expect(select.getAttribute('aria-label')).toContain('Select proficiency level for');
    });
  });

  describe('Integration with Reactive Forms', () => {
    it('should work with FormControl', () => {
      const formControl = new FormControl();
      component.registerOnChange((value) => formControl.setValue(value, { emitEvent: false }));

      component.addSkill(mockSkills[0]);

      expect(formControl.value).toEqual(component.selectedSkills);
    });

    it('should update when FormControl value changes', () => {
      const skills = [mockSkills[0], mockSkills[1]];
      component.writeValue(skills);

      expect(component.selectedSkills).toEqual(skills);
    });

    it('should propagate disabled state from FormControl', () => {
      component.setDisabledState(true);

      expect(component.disabled).toBe(true);
      expect(component.skillControl.disabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty availableSkills array', () => {
      component.availableSkills = [];
      component.ngOnInit();
      fixture.detectChanges();

      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(0);
      });
    });

    it('should handle skills without category', () => {
      const skillWithoutCategory = { ...mockSkills[0], category: '' };
      component.availableSkills = [skillWithoutCategory];
      component.ngOnInit();
      fixture.detectChanges();

      component.skillControl.setValue('Fiber');
      component.filteredSkills$.subscribe(skills => {
        expect(skills.length).toBe(1);
      });
    });

    it('should handle rapid skill additions', () => {
      component.addSkill(mockSkills[0]);
      component.addSkill(mockSkills[1]);
      component.addSkill(mockSkills[2]);
      component.addSkill(mockSkills[3]);

      expect(component.selectedSkills.length).toBe(4);
    });

    it('should handle rapid skill removals', () => {
      component.selectedSkills = [...mockSkills];

      component.removeSkill(mockSkills[0]);
      component.removeSkill(mockSkills[1]);
      component.removeSkill(mockSkills[2]);
      component.removeSkill(mockSkills[3]);

      expect(component.selectedSkills.length).toBe(0);
    });

    it('should handle rapid level changes', () => {
      component.selectedSkills = [mockSkills[0]];

      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Intermediate);
      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Advanced);
      component.updateSkillLevel(component.selectedSkills[0], SkillLevel.Expert);

      expect(component.selectedSkills[0].level).toBe(SkillLevel.Expert);
    });
  });
});
