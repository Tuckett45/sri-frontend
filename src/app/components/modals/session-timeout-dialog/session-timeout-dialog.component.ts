import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SessionEndReason } from '../../../models/auth.model';

/**
 * Data passed into the session-timeout dialog when it is opened.
 */
export interface SessionTimeoutDialogData {
  /** Why the session is ending (idle vs token expiry). */
  reason: SessionEndReason;
  /** Milliseconds remaining until automatic logout at the time of opening. */
  msUntilLogout: number;
  /** Whether the user is allowed to keep the session alive. */
  canExtend: boolean;
}

/**
 * Result returned when the dialog closes.
 * - 'extend'  : user chose to stay logged in.
 * - 'logout'  : user chose to log out now.
 * - 'expired' : the countdown reached zero (handled by the service's own timer).
 */
export type SessionTimeoutDialogResult = 'extend' | 'logout' | 'expired';

@Component({
  selector: 'session-timeout-dialog',
  templateUrl: './session-timeout-dialog.component.html',
  styleUrls: ['./session-timeout-dialog.component.scss'],
  standalone: false
})
export class SessionTimeoutDialogComponent implements OnInit, OnDestroy {
  /** Whole seconds remaining until logout, driven by a local countdown. */
  secondsRemaining = 0;
  /** Whether the "Stay logged in" action is offered. */
  readonly canExtend: boolean;

  private deadline = 0;
  private tick?: number;

  constructor(
    public dialogRef: MatDialogRef<SessionTimeoutDialogComponent, SessionTimeoutDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: SessionTimeoutDialogData
  ) {
    this.canExtend = data.canExtend;
    this.deadline = Date.now() + Math.max(0, data.msUntilLogout);
    this.secondsRemaining = Math.ceil(Math.max(0, data.msUntilLogout) / 1000);
  }

  ngOnInit(): void {
    // Prevent closing by backdrop click / escape so the user must make a choice.
    this.dialogRef.disableClose = true;

    this.tick = window.setInterval(() => {
      const remaining = this.deadline - Date.now();
      this.secondsRemaining = Math.max(0, Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        this.dialogRef.close('expired');
      }
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.tick) {
      clearInterval(this.tick);
      this.tick = undefined;
    }
  }

  get title(): string {
    return this.canExtend ? 'Session about to expire' : 'Session expiring';
  }

  get message(): string {
    return this.canExtend
      ? 'You have been inactive for a while. For your security you will be signed out soon.'
      : 'Your session is about to expire and cannot be extended. Please save your work.';
  }

  stay(): void {
    this.dialogRef.close('extend');
  }

  logoutNow(): void {
    this.dialogRef.close('logout');
  }
}
