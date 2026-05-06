import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-contact-info',
  templateUrl: './contact-info.component.html',
  styleUrls: ['./contact-info.component.scss']
})
export class ContactInfoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  contactForm!: FormGroup;
  isSaving = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      personalEmail: ['', [Validators.required, Validators.email]],
      emergencyContactName: ['', Validators.required],
      emergencyContactPhone: ['', Validators.required]
    });
  }

  onSave(): void {
    if (this.contactForm.valid) {
      this.isSaving = true;
      setTimeout(() => { this.isSaving = false; }, 1000);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
