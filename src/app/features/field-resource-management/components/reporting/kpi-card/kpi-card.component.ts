import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss']
})
export class KPICardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() change = 0;
  @Input() icon = 'bar_chart';

  get changePositive(): boolean {
    return this.change >= 0;
  }
}
