import { Component } from '@angular/core';
import { FeatureFlagKey, FeatureFlagService } from '../../services/feature-flag.service';

@Component({
  selector: 'app-feature-flag-panel',
  templateUrl: './feature-flag-panel.component.html',
  styleUrls: ['./feature-flag-panel.component.scss'],
  standalone: false
})
export class FeatureFlagPanelComponent {
  readonly flags = this.featureFlagService.flags;
  readonly isDirty = this.featureFlagService.isDirty;

  constructor(private readonly featureFlagService: FeatureFlagService) {}

  onToggle(key: FeatureFlagKey, enabled: boolean): void {
    this.featureFlagService.setFlag(key, enabled);
  }

  reset(): void {
    this.featureFlagService.reset();
  }
}
