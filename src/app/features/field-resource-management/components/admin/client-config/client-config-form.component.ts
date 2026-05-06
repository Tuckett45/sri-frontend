import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-config-form',
  templateUrl: './client-config-form.component.html',
  styleUrls: ['./client-config-form.component.scss']
})
export class ClientConfigFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  clientConfigForm!: FormGroup;
  billingTypes = ['T&M', 'Fixed', 'Retainer'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.clientConfigForm = this.fb.group({
      clientName: ['', Validators.required],
      billingType: ['T&M', Validators.required],
      rate: [0, [Validators.required, Validators.min(0)]],
      contactEmail: ['', [Validators.required, Validators.email]],
      notes: ['']
    });
  }

  onSave(): void {
    if (this.clientConfigForm.valid) {
      console.log('Saving client config', this.clientConfigForm.value);
    }
  }

  onCancel(): void {
    this.clientConfigForm.reset({ billingType: 'T&M', rate: 0 });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
