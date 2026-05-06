import { Component, Input } from '@angular/core';

interface Competency {
  skill: string;
  category: string;
  proficiency: number;
}

@Component({
  selector: 'app-competency-section',
  templateUrl: './competency-section.component.html',
  styleUrls: ['./competency-section.component.scss']
})
export class CompetencySectionComponent {
  @Input() technicianId = '';

  competencies: Competency[] = [
    { skill: 'Structured Cabling', category: 'Installation', proficiency: 4 },
    { skill: 'Fiber Optics', category: 'Installation', proficiency: 3 },
    { skill: 'Network Testing', category: 'Testing', proficiency: 5 },
    { skill: 'Safety Protocols', category: 'General', proficiency: 5 }
  ];

  get starRange(): number[] { return [1, 2, 3, 4, 5]; }

  addCompetency(): void {
    this.competencies = [...this.competencies, { skill: 'New Skill', category: 'General', proficiency: 1 }];
  }

  setProficiency(competency: Competency, level: number): void {
    competency.proficiency = level;
    this.competencies = [...this.competencies];
  }
}
