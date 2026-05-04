import { Component, Input, Output, EventEmitter } from '@angular/core';
import { QuickAction } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-quick-actions-widget',
  templateUrl: './quick-actions-widget.component.html',
  styleUrls: ['./quick-actions-widget.component.scss']
})
export class QuickActionsWidgetComponent {
  @Input() actions: QuickAction[] = [];
  @Output() actionClicked = new EventEmitter<string>();

  getButtonColor(action: QuickAction): string | undefined {
    if (action.color === 'orange') {
      return 'accent';
    }
    if (action.color === 'green') {
      return undefined; // handled via CSS class
    }
    return action.color;
  }

  isOrange(action: QuickAction): boolean {
    return action.color === 'orange';
  }

  isGreen(action: QuickAction): boolean {
    return action.color === 'green';
  }

  onActionClick(action: QuickAction): void {
    if (action.action) {
      this.actionClicked.emit(action.action);
    }
  }
}
