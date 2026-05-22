import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatDrawer } from '@angular/material/sidenav';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Main layout component for Field Resource Management
 * Includes skip navigation, header, navigation, and main content area
 */
@Component({
  selector: 'frm-layout',
  templateUrl: './frm-layout.component.html',
  styleUrls: ['./frm-layout.component.scss']
})
export class FrmLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('drawer', { static: true }) drawer!: MatDrawer;

  drawerMode: 'side' | 'over' = 'side';
  drawerOpened = true;

  private destroy$ = new Subject<void>();

  constructor(private breakpointObserver: BreakpointObserver) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result.matches) {
          this.drawerMode = 'over';
          this.drawerOpened = false;
        } else {
          this.drawerMode = 'side';
          this.drawerOpened = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
