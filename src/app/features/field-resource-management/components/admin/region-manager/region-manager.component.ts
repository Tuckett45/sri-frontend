import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Store } from '@ngrx/store';
import { Region } from '../../../models/region.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { UserRole } from '../../../../../models/role.enum';

@Component({
  selector: 'app-region-manager',
  templateUrl: './region-manager.component.html',
  styleUrls: ['./region-manager.component.scss']
})
export class RegionManagerComponent implements OnInit {
  displayedColumns: string[] = ['name', 'technicianCount', 'jobCount', 'actions'];
  dataSource = new MatTableDataSource<Region>();
  UserRole = UserRole;

  constructor(
    private store: Store,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Load regions from state
    // this.store.select(selectRegions).subscribe(regions => {
    //   this.dataSource.data = regions;
    // });
    
    // Mock data for demonstration
    this.dataSource.data = [
      {
        id: '1',
        name: 'Northeast',
        technicianCount: 25,
        jobCount: 150,
        boundaries: {
          states: ['NY', 'NJ', 'CT', 'MA', 'PA']
        },
        createdAt: new Date()
      },
      {
        id: '2',
        name: 'Southeast',
        technicianCount: 18,
        jobCount: 95,
        boundaries: {
          states: ['FL', 'GA', 'SC', 'NC', 'VA']
        },
        createdAt: new Date()
      },
      {
        id: '3',
        name: 'Midwest',
        technicianCount: 22,
        jobCount: 120,
        boundaries: {
          states: ['IL', 'IN', 'OH', 'MI', 'WI']
        },
        createdAt: new Date()
      }
    ];
  }

  onCreateRegion(): void {
    // Open region form dialog
    // const dialogRef = this.dialog.open(RegionFormDialogComponent, {
    //   width: '600px',
    //   data: { mode: 'create' }
    // });
    
    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.store.dispatch(createRegion({ region: result }));
    //   }
    // });
  }

  onEditRegion(region: Region): void {
    // Open region form dialog with existing data
    // const dialogRef = this.dialog.open(RegionFormDialogComponent, {
    //   width: '600px',
    //   data: { mode: 'edit', region }
    // });
    
    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.store.dispatch(updateRegion({ id: region.id, region: result }));
    //   }
    // });
  }

  onDeleteRegion(region: Region): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Region',
        message: `Are you sure you want to delete the region "${region.name}"? This will affect ${region.technicianCount} technicians and ${region.jobCount} jobs.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // this.store.dispatch(deleteRegion({ id: region.id }));
      }
    });
  }

  onViewRegionDetails(region: Region): void {
    // Navigate to region detail view or open dialog
    // this.router.navigate(['/field-resource-management/admin/regions', region.id]);
  }

  onViewTechnicians(region: Region): void {
    // Navigate to technician list filtered by region
    // this.router.navigate(['/field-resource-management/technicians'], {
    //   queryParams: { region: region.id }
    // });
  }

  onViewJobs(region: Region): void {
    // Navigate to job list filtered by region
    // this.router.navigate(['/field-resource-management/jobs'], {
    //   queryParams: { region: region.id }
    // });
  }
}
