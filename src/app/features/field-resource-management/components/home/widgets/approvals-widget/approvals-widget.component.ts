import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';

@Component({
  selector: 'app-approvals-widget',
  templateUrl: './approvals-widget.component.html',
  styleUrls: ['./approvals-widget.component.scss']
})
export class ApprovalsWidgetComponent implements OnInit {
  pendingCount = 0;
  pendingItems: any[] = [];
  approvalsRoute = '/field-resource-management/approvals';

  constructor(private store: Store, private router: Router) {}

  ngOnInit(): void {
    this.store.select(state => (state as any)['approvals']?.pending || []).subscribe(
      (items: any[]) => {
        this.pendingItems = items;
        this.pendingCount = items.length;
      }
    );
  }

  viewAll(): void {
    this.router.navigate([this.approvalsRoute]);
  }
}
