import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-quote-delivery',
  templateUrl: './quote-delivery.component.html',
  styleUrls: ['./quote-delivery.component.scss']
})
export class QuoteDeliveryComponent {
  form: FormGroup;
  sent = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      recipientEmail: ['', [Validators.required, Validators.email]],
      subject: ['Quote Proposal', Validators.required],
      message: ['Please find attached the quote proposal for your project. We look forward to working with you.', Validators.required],
      sendCopy: [true]
    });
  }

  sendQuote(): void {
    if (this.form.valid) {
      console.log('Sending quote:', this.form.value);
      this.sent = true;
    }
  }
}
