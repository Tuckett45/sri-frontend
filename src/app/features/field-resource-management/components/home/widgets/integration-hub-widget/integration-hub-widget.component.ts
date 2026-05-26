import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IntegrationHubService } from '../../../../services/integration-hub.service';
import {
  IntegrationHealthStatus,
  SpectrumJobResult,
  ProcurementOrderResult,
  TravelBookingResult,
  InvoiceResult
} from '../../../../models/atlas-lifecycle.models';

interface IntegrationAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  loading: boolean;
}

@Component({
  selector: 'app-integration-hub-widget',
  templateUrl: './integration-hub-widget.component.html',
  styleUrls: ['./integration-hub-widget.component.scss']
})
export class IntegrationHubWidgetComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;

  healthStatus: IntegrationHealthStatus | null = null;
  healthLoading = false;
  healthError: string | null = null;

  actions: IntegrationAction[] = [
    {
      id: 'spectrum',
      label: 'Create Spectrum Job',
      icon: 'work',
      description: 'Register job in scheduling system',
      color: '#1565c0',
      loading: false
    },
    {
      id: 'procurement',
      label: 'Submit PO',
      icon: 'shopping_cart',
      description: 'Submit procurement order',
      color: '#2e7d32',
      loading: false
    },
    {
      id: 'travel',
      label: 'Book Travel',
      icon: 'flight',
      description: 'Coordinate travel logistics',
      color: '#6a1b9a',
      loading: false
    },
    {
      id: 'invoice',
      label: 'Process Invoice',
      icon: 'receipt_long',
      description: 'Submit to accounting',
      color: '#e65100',
      loading: false
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private integrationService: IntegrationHubService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadHealth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadHealth(): void {
    this.healthLoading = true;
    this.healthError = null;

    this.integrationService.getIntegrationHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.healthStatus = status;
          this.healthLoading = false;
        },
        error: () => {
          this.healthError = 'Unable to check integration status.';
          this.healthLoading = false;
        }
      });
  }

  executeAction(action: IntegrationAction): void {
    if (action.loading || !this.projectId) return;

    action.loading = true;

    switch (action.id) {
      case 'spectrum':
        this.integrationService.createSpectrumJob({
          projectId: this.projectId,
          jobData: {}
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: (result: SpectrumJobResult) => {
            action.loading = false;
            this.snackBar.open(
              `Spectrum job ${result.jobNumber} created successfully`,
              'Close',
              { duration: 5000 }
            );
          },
          error: (err) => {
            action.loading = false;
            this.snackBar.open(
              `Failed to create Spectrum job: ${err.message}`,
              'Close',
              { duration: 5000 }
            );
          }
        });
        break;

      case 'procurement':
        this.integrationService.submitProcurementOrder({
          projectId: this.projectId,
          orderData: {}
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: (result: ProcurementOrderResult) => {
            action.loading = false;
            this.snackBar.open(
              `PO ${result.orderNumber} submitted successfully`,
              'Close',
              { duration: 5000 }
            );
          },
          error: (err) => {
            action.loading = false;
            this.snackBar.open(
              `Failed to submit PO: ${err.message}`,
              'Close',
              { duration: 5000 }
            );
          }
        });
        break;

      case 'travel':
        this.integrationService.bookTravel({
          projectId: this.projectId,
          travelData: {}
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: (result: TravelBookingResult) => {
            action.loading = false;
            this.snackBar.open(
              `Travel booked: ${result.bookingReference}`,
              'Close',
              { duration: 5000 }
            );
          },
          error: (err) => {
            action.loading = false;
            this.snackBar.open(
              `Failed to book travel: ${err.message}`,
              'Close',
              { duration: 5000 }
            );
          }
        });
        break;

      case 'invoice':
        this.integrationService.processInvoice({
          projectId: this.projectId,
          invoiceData: {}
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: (result: InvoiceResult) => {
            action.loading = false;
            this.snackBar.open(
              `Invoice ${result.invoiceNumber} processed`,
              'Close',
              { duration: 5000 }
            );
          },
          error: (err) => {
            action.loading = false;
            this.snackBar.open(
              `Failed to process invoice: ${err.message}`,
              'Close',
              { duration: 5000 }
            );
          }
        });
        break;
    }
  }

  getIntegrationStatus(name: string): string {
    if (!this.healthStatus?.integrations) return 'unknown';
    const integration = this.healthStatus.integrations.find(
      i => i.name.toLowerCase().includes(name.toLowerCase())
    );
    return integration?.status || 'unknown';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return 'check_circle';
      case 'degraded': return 'warning';
      case 'down': return 'error';
      default: return 'help_outline';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'healthy': return 'status-healthy';
      case 'degraded': return 'status-degraded';
      case 'down': return 'status-down';
      default: return 'status-unknown';
    }
  }
}
