import { Component } from '@angular/core';

interface ChecklistTask {
  label: string;
  done: boolean;
}

interface ChecklistPhase {
  name: string;
  tasks: ChecklistTask[];
}

@Component({
  selector: 'app-onboarding-checklist',
  templateUrl: './onboarding-checklist.component.html',
  styleUrls: ['./onboarding-checklist.component.scss']
})
export class OnboardingChecklistComponent {
  phases: ChecklistPhase[] = [
    {
      name: 'Pre-Employment',
      tasks: [
        { label: 'Background check initiated', done: true },
        { label: 'Drug screening scheduled', done: true },
        { label: 'Reference checks completed', done: false },
        { label: 'Offer letter signed', done: true },
        { label: 'I-9 documents verified', done: false }
      ]
    },
    {
      name: 'Day 1',
      tasks: [
        { label: 'Badge and access provisioned', done: false },
        { label: 'IT equipment issued', done: false },
        { label: 'HR orientation completed', done: false },
        { label: 'Emergency contacts on file', done: false },
        { label: 'Parking/access instructions given', done: false }
      ]
    },
    {
      name: 'Week 1',
      tasks: [
        { label: 'Department introduction tour', done: false },
        { label: 'Safety training completed', done: false },
        { label: 'Tools and equipment assigned', done: false },
        { label: 'Mentor/buddy assigned', done: false },
        { label: 'System logins configured', done: false }
      ]
    },
    {
      name: 'Month 1',
      tasks: [
        { label: 'First performance check-in', done: false },
        { label: 'Benefits enrollment completed', done: false },
        { label: 'First paycheck verified', done: false },
        { label: 'Certifications registered', done: false },
        { label: '30-day review scheduled', done: false }
      ]
    }
  ];

  phaseProgress(phase: ChecklistPhase): number {
    const done = phase.tasks.filter(t => t.done).length;
    return Math.round((done / phase.tasks.length) * 100);
  }

  toggle(task: ChecklistTask): void { task.done = !task.done; }
}
