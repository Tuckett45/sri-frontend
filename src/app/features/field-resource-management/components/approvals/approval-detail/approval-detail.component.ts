import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-approval-detail',
  templateUrl: './approval-detail.component.html',
  styleUrls: ['./approval-detail.component.scss']
})
export class ApprovalDetailComponent implements OnInit, OnDestroy {
  approvalId?: string;
  approval: any = {
    id: '',
    type: 'timecard',
    technician: 'John Smith',
    period: 'Apr 28 - May 4',
    hours: 42.5,
    status: 'pending',
    details: [
      { date: 'Apr 28', hours: 8.5, jobId: 'JOB-001' },
      { date: 'Apr 29', hours: 9, jobId: 'JOB-002' },
      { date: 'Apr 30', hours: 8, jobId: 'JOB-003' }
    ]
  };
  commentForm!: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.commentForm = this.fb.group({ comment: [''] });
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.approvalId = params['id'];
      this.approval.id = params['id'];
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  approve(): void {
    this.approval.status = 'approved';
    this.approval.comment = this.commentForm.value.comment;
  }

  reject(): void {
    this.approval.status = 'rejected';
    this.approval.comment = this.commentForm.value.comment;
  }
}
