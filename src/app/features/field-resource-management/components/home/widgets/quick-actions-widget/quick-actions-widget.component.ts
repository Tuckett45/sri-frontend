import { Component, Input } from '@angular/core';
import { QuickAction } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-quick-actions-widget',
  templateUrl: './quick-actions-widget.component.html',
  styleUrls: ['./quick-actions-widget.component.scss']
})
export class QuickActionsWidgetComponent {
  @Input() actions: QuickAction[] = [];

  getButtonColor(action: QuickAction): string | undefined {
    if (action.color === 'orange') {
      return 'accent';
    }
    return action.color;
  }

  isOrange(action: QuickAction): boolean {
    return action.color === 'orange';
  }
}
