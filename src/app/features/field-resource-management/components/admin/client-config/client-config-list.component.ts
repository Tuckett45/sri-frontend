import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-config-list',
  templateUrl: './client-config-list.component.html',
  styleUrls: ['./client-config-list.component.scss']
})
export class ClientConfigListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  clients: any[] = [];
  displayedColumns = ['clientName', 'billingType', 'rate', 'contactEmail', 'active', 'actions'];

  ngOnInit(): void {}

  addClient(): void {
    // Open form/dialog logic here
  }

  editClient(client: any): void {
    // Edit logic here
  }

  deleteClient(client: any): void {
    this.clients = this.clients.filter(c => c !== client);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
