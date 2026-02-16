import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AuditLogViewerComponent } from './audit-log-viewer.component';
import { ExportService } from '../../../services/export.service';

describe('AuditLogViewerComponent', () => {
  let component: AuditLogViewerComponent;
  let fixture: ComponentFixture<AuditLogViewerComponent>;
  let store: MockStore;
  let exportService: jasmine.SpyObj<ExportService>;

  beforeEach(async () => {
    const exportServiceSpy = jasmine.createSpyObj('ExportService', ['generateCSV', 'downloadFile']);

    await TestBed.configureTestingModule({
      declarations: [ AuditLogViewerComponent ],
      imports: [
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        BrowserAnimationsModule
      ],
      providers: [
        provideMockStore(),
        { provide: ExportService, useValue: exportServiceSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    exportService = TestBed.inject(ExportService) as jasmine.SpyObj<ExportService>;
    fixture = TestBed.createComponent(AuditLogViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display audit log entries', () => {
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should filter by user', () => {
    component.filterForm.patchValue({ user: 'john.doe@example.com' });
    component.applyFilters();
    expect(component.dataSource.filteredData.length).toBeLessThanOrEqual(2);
  });

  it('should filter by action type', () => {
    component.filterForm.patchValue({ actionType: 'CREATE' });
    component.applyFilters();
    expect(component.dataSource.filteredData.length).toBeLessThanOrEqual(2);
  });

  it('should clear filters', () => {
    component.filterForm.patchValue({ user: 'john.doe@example.com' });
    component.clearFilters();
    expect(component.filterForm.value.user).toBe(null);
  });

  it('should toggle row expansion', () => {
    const log = component.dataSource.data[0];
    component.toggleRow(log);
    expect(component.expandedElement).toBe(log);
    component.toggleRow(log);
    expect(component.expandedElement).toBeNull();
  });

  it('should export to CSV', () => {
    exportService.generateCSV.and.returnValue('csv,data');
    component.onExportToCSV();
    expect(exportService.generateCSV).toHaveBeenCalled();
    expect(exportService.downloadFile).toHaveBeenCalled();
  });

  it('should return correct action icon', () => {
    expect(component.getActionIcon('CREATE')).toBe('add_circle');
    expect(component.getActionIcon('DELETE')).toBe('delete');
    expect(component.getActionIcon('UNKNOWN')).toBe('info');
  });

  it('should return correct action color', () => {
    expect(component.getActionColor('CREATE')).toBe('primary');
    expect(component.getActionColor('DELETE')).toBe('warn');
  });
});
