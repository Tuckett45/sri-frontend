import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MarketControllerEntry } from 'src/app/models/market-controller-entry.model';

@Component({
  selector: 'app-market-controller-modal',
  templateUrl: './market-controller-modal.component.html',
  styleUrls: ['./market-controller-modal.component.scss']
})
export class MarketControllerModalComponent {
  @Input() type = '';
  @Input() visible = false;
  @Output() save = new EventEmitter<MarketControllerEntry>();
  @Output() cancel = new EventEmitter<void>();

  entryForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.entryForm = this.fb.group({
      poNumber: ['', Validators.required],
      vendor: ['', Validators.required],
      segmentReason: ['', Validators.required],
      date: [new Date(), Validators.required],
      amount: [null, Validators.required],
      notes: ['']
    });
  }

  submit() {
    if (this.entryForm.valid) {
      this.save.emit(this.entryForm.value as MarketControllerEntry);
      this.entryForm.reset({ date: new Date() });
    }
  }

  onCancel() {
    this.entryForm.reset({ date: new Date() });
    this.cancel.emit();
  }
}
