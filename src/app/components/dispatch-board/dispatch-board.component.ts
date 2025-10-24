import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Textarea } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';

interface DispatchUser {
  id: string;
  name: string;
  role: string;
  onCall?: boolean;
  workload: number;
}

export type DispatchStage = 'intake' | 'triage' | 'ready' | 'dispatch' | 'field' | 'closed';

interface DispatchTicket {
  id: string;
  summary: string;
  market: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  stage: DispatchStage;
  requestedBy: string;
  dueDate: string;
  assignee?: string;
  eta?: string;
  notes?: string;
  validationError?: string;
}

interface RoadmapSegment {
  label: string;
  start: string;
  end: string;
  color: string;
  emphasis?: boolean;
  description?: string;
}

interface RoadmapLane {
  label: string;
  segments: RoadmapSegment[];
}

@Component({
  selector: 'dispatch-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DropdownModule,
    ButtonModule,
    TagModule,
    Textarea,
    InputTextModule
  ],
  templateUrl: './dispatch-board.component.html',
  styleUrls: ['./dispatch-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DispatchBoardComponent {
  readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  readonly roadmapLanes: RoadmapLane[] = [
    {
      label: 'Management & Operations Improvement',
      segments: [
        { label: 'Operating Review', start: 'Jan', end: 'Feb', color: '#bfdbfe' },
        { label: 'Process Design', start: 'Mar', end: 'Apr', color: '#93c5fd' },
        { label: 'Field Pilot', start: 'May', end: 'Jun', color: '#60a5fa', emphasis: true },
        { label: 'Scale + Optimization', start: 'Jul', end: 'Oct', color: '#3b82f6' },
        { label: 'Stabilize', start: 'Nov', end: 'Dec', color: '#1d4ed8' }
      ]
    },
    {
      label: 'Dispatch Enablement',
      segments: [
        { label: 'Workflow Mapping', start: 'Jan', end: 'Feb', color: '#fed7aa' },
        { label: 'Tooling Fit', start: 'Mar', end: 'Mar', color: '#fdba74' },
        { label: 'Integration Build', start: 'Apr', end: 'May', color: '#fb923c' },
        { label: 'Training', start: 'Jun', end: 'Jul', color: '#f97316' },
        { label: 'Go-Live Support', start: 'Aug', end: 'Sep', color: '#ea580c' },
        { label: 'Continuous Improvement', start: 'Oct', end: 'Dec', color: '#c2410c' }
      ]
    },
    {
      label: 'Dispatch',
      segments: [
        { label: 'Intake', start: 'Jan', end: 'Jan', color: '#bae6fd' },
        { label: 'Triage', start: 'Feb', end: 'Mar', color: '#7dd3fc' },
        { label: 'Scheduling', start: 'Apr', end: 'May', color: '#38bdf8' },
        { label: 'Assign & Dispatch', start: 'Jun', end: 'Aug', color: '#0284c7', emphasis: true },
        { label: 'Field Execution', start: 'Sep', end: 'Oct', color: '#0369a1' },
        { label: 'Closeout', start: 'Nov', end: 'Dec', color: '#0c4a6e' }
      ]
    }
  ];

  readonly users: DispatchUser[] = [
    { id: 'cm', name: 'Caroline Morris', role: 'Dispatch Lead', onCall: true, workload: 7 },
    { id: 'jg', name: 'Jordan Green', role: 'Field Supervisor', workload: 5 },
    { id: 'ls', name: 'Liam Singh', role: 'Network Engineer', workload: 3 },
    { id: 'rp', name: 'Riley Park', role: 'Technician', workload: 6 },
    { id: 'am', name: 'Avery Moore', role: 'Technician', workload: 4 }
  ];

  readonly userOptions = this.users.map(user => ({ label: `${user.name} - ${user.role}`, value: user.id }));

  tickets: DispatchTicket[] = [
    {
      id: 'INC-1081',
      summary: 'OSP fiber damage near Maple & 3rd',
      market: 'West District',
      category: 'Restoration',
      priority: 'Critical',
      stage: 'intake',
      requestedBy: 'CM Ops',
      dueDate: '2024-10-28'
    },
    {
      id: 'INC-1094',
      summary: 'Utility conflict at trench 14',
      market: 'North Valley',
      category: 'Make Ready',
      priority: 'High',
      stage: 'triage',
      requestedBy: 'Field Engineer',
      dueDate: '2024-11-02',
      assignee: 'jg',
      eta: 'Awaiting survey results'
    },
    {
      id: 'INC-1102',
      summary: 'Replace failed splice enclosure',
      market: 'South Loop',
      category: 'Maintenance',
      priority: 'Medium',
      stage: 'ready',
      requestedBy: 'Network NOC',
      dueDate: '2024-11-06'
    },
    {
      id: 'INC-1120',
      summary: 'Permit resubmission for Segment 7',
      market: 'East Ridge',
      category: 'Permitting',
      priority: 'Low',
      stage: 'dispatch',
      requestedBy: 'Program Mgmt',
      dueDate: '2024-11-15',
      assignee: 'cm',
      eta: 'In city review'
    }
  ];

  readonly stageLabels: Record<DispatchStage, string> = {
    intake: 'Intake',
    triage: 'Triage',
    ready: 'Ready for Dispatch',
    dispatch: 'Dispatched',
    field: 'In Field',
    closed: 'Closed'
  };

  readonly stageColors: Record<DispatchStage, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
    intake: 'contrast',
    triage: 'warn',
    ready: 'info',
    dispatch: 'success',
    field: 'info',
    closed: 'secondary'
  };

  readonly stageSequence: DispatchStage[] = ['intake', 'triage', 'ready', 'dispatch', 'field', 'closed'];

  getMonthGridStyle(segment: RoadmapSegment): { [key: string]: string } {
    const startIndex = this.months.indexOf(segment.start);
    const endIndex = this.months.indexOf(segment.end);
    if (startIndex === -1 || endIndex === -1) {
      return { 'grid-column': '1 / span 1' };
    }

    const startColumn = Math.min(startIndex, endIndex) + 1;
    const endColumn = Math.max(startIndex, endIndex) + 2;

    return {
      'grid-column': `${startColumn} / ${endColumn}`,
      'background': segment.color,
      'border': segment.emphasis ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(15,23,42,0.25)'
    };
  }

  getStageCount(stage: DispatchStage): number {
    return this.tickets.filter(ticket => ticket.stage === stage).length;
  }

  getQueueTickets(): DispatchTicket[] {
    return this.tickets.filter(ticket => ticket.stage === 'dispatch' || ticket.stage === 'field');
  }

  resolveAssigneeName(id?: string): string {
    if (!id) {
      return 'Unassigned';
    }

    const match = this.users.find(user => user.id === id);
    return match ? match.name : 'Unassigned';
  }

  resolveStageLabel(stage: DispatchStage | string | null | undefined): string {
    if (!stage) {
      return this.stageLabels.intake;
    }

    const key = stage as DispatchStage;
    return this.stageLabels[key] ?? stage;
  }

  resolveStageSeverity(stage: DispatchStage | string | null | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (!stage) {
      return this.stageColors.intake;
    }

    const key = stage as DispatchStage;
    return this.stageColors[key] ?? this.stageColors.intake;
  }

  onAssigneeChange(ticket: DispatchTicket, value: string | undefined): void {
    ticket.assignee = value;
    ticket.validationError = undefined;
    if (value) {
      const selected = this.users.find(user => user.id === value);
      ticket.eta = selected ? `ETA aligns with ${selected.name.split(' ')[0]}'s schedule` : ticket.eta;
    }
  }

  advanceStage(ticket: DispatchTicket): void {
    const currentIndex = this.stageSequence.indexOf(ticket.stage);
    if (currentIndex === -1 || currentIndex === this.stageSequence.length - 1) {
      return;
    }

    if (ticket.stage === 'ready' && !ticket.assignee) {
      ticket.validationError = 'Select an assignee before dispatching.';
      return;
    }

    ticket.validationError = undefined;
    ticket.stage = this.stageSequence[currentIndex + 1];
  }

  dispatchTicket(ticket: DispatchTicket): void {
    if (!ticket.assignee) {
      ticket.validationError = 'Assign a field resource before dispatching.';
      return;
    }

    ticket.validationError = undefined;
    ticket.stage = 'dispatch';
    ticket.eta = ticket.eta ?? 'Crew notified';
  }

  markFieldComplete(ticket: DispatchTicket): void {
    if (ticket.stage === 'dispatch') {
      ticket.stage = 'field';
      ticket.eta = 'On site';
    } else if (ticket.stage === 'field') {
      ticket.stage = 'closed';
      ticket.eta = 'Closed';
    }
  }
}
