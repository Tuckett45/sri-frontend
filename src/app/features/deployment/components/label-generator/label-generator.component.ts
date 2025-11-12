import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'ark-label-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule],
  templateUrl: './label-generator.component.html',
  styleUrls: ['./label-generator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelGeneratorComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({
    hostname: [''],
    serial: [''],
    rack: [''],
    ru: [''],
    slot: [''],
    port: [''],
  });

  protected readonly qrUrl = computed(() => {
    const data = this.form.getRawValue();
    const payload = JSON.stringify(data);
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(payload)}&size=180x180`;
  });

  protected print(): void {
    window.print();
  }
}
