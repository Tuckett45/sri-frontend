import { Component, Input } from '@angular/core';

import { LeaveType } from '../../../models/pto.models';

/**
 * PTO Leave Type Chip Component
 *
 * Displays a leave type as a styled chip/badge. Predefined types use a solid
 * background style, while custom types use an outlined/bordered style.
 *
 * Requirements: 8.1, 8.2
 */
@Component({
  selector: 'app-pto-leave-type-chip',
  templateUrl: './pto-leave-type-chip.component.html',
  styleUrls: ['./pto-leave-type-chip.component.scss']
})
export class PtoLeaveTypeChipComponent {
  @Input() leaveType!: LeaveType;
}
