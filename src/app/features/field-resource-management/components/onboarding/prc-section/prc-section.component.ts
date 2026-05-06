import { Component } from '@angular/core';

interface PrcItem {
  label: string;
  completed: boolean;
  dueDate?: Date;
}

@Component({
  selector: 'app-prc-section',
  templateUrl: './prc-section.component.html',
  styleUrls: ['./prc-section.component.scss']
})
export class PRCSectionComponent {
  items: PrcItem[] = [
    { label: 'Review and sign employment agreement', completed: true },
    { label: 'Complete I-9 verification', completed: true },
    { label: 'Set up direct deposit', completed: false, dueDate: new Date('2026-05-10') },
    { label: 'Review employee handbook', completed: false },
    { label: 'Complete benefits enrollment', completed: false, dueDate: new Date('2026-05-15') },
    { label: 'Submit emergency contact info', completed: true },
    { label: 'Complete safety training video', completed: false },
    { label: 'Acknowledge code of conduct', completed: true }
  ];

  get completedCount(): number { return this.items.filter(i => i.completed).length; }
  get progress(): number { return Math.round((this.completedCount / this.items.length) * 100); }

  toggleItem(item: PrcItem): void { item.completed = !item.completed; }
}
