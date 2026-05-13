import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { BatchOperationsToolbarComponent } from './batch-operations-toolbar.component';

describe('BatchOperationsToolbarComponent', () => {
  let component: BatchOperationsToolbarComponent;
  let fixture: ComponentFixture<BatchOperationsToolbarComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ BatchOperationsToolbarComponent ],
      imports: [
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    fixture = TestBed.createComponent(BatchOperationsToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit clearSelection event', () => {
    spyOn(component.clearSelection, 'emit');
    component.onClearSelection();
    expect(component.clearSelection.emit).toHaveBeenCalled();
  });

  it('should emit batchOperation event for update status', () => {
    spyOn(component.batchOperation, 'emit');
    component.onUpdateStatus();
    expect(component.batchOperation.emit).toHaveBeenCalledWith({ type: 'updateStatus' });
  });

  it('should emit batchOperation event for reassign', () => {
    spyOn(component.batchOperation, 'emit');
    component.onReassign();
    expect(component.batchOperation.emit).toHaveBeenCalledWith({ type: 'reassign' });
  });

  it('should open confirm dialog on delete', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    spyOn(component.batchOperation, 'emit');
    
    component.selectedCount = 5;
    component.onDelete();
    
    expect(dialog.open).toHaveBeenCalled();
  });

  it('should emit delete operation when confirmed', (done) => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    spyOn(component.batchOperation, 'emit');
    
    component.onDelete();
    
    setTimeout(() => {
      expect(component.batchOperation.emit).toHaveBeenCalledWith({ type: 'delete' });
      done();
    }, 100);
  });

  it('should not emit delete operation when cancelled', (done) => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    spyOn(component.batchOperation, 'emit');
    
    component.onDelete();
    
    setTimeout(() => {
      expect(component.batchOperation.emit).not.toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should display correct selected count', () => {
    component.selectedCount = 3;
    component.visible = true;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const countElement = compiled.querySelector('.count');
    expect(countElement.textContent).toContain('3 items selected');
  });

  it('should display singular form for single item', () => {
    component.selectedCount = 1;
    component.visible = true;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const countElement = compiled.querySelector('.count');
    expect(countElement.textContent).toContain('1 item selected');
  });
});
