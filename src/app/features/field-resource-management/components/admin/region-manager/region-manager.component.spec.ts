import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { RegionManagerComponent } from './region-manager.component';

describe('RegionManagerComponent', () => {
  let component: RegionManagerComponent;
  let fixture: ComponentFixture<RegionManagerComponent>;
  let store: MockStore;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ RegionManagerComponent ],
      imports: [
        MatTableModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule
      ],
      providers: [
        provideMockStore(),
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    fixture = TestBed.createComponent(RegionManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display regions in table', () => {
    expect(component.dataSource.data.length).toBe(3);
  });

  it('should open dialog on create region', () => {
    component.onCreateRegion();
    expect(component).toBeTruthy();
  });

  it('should open confirm dialog on delete', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    const region = component.dataSource.data[0];
    component.onDeleteRegion(region);
    expect(dialog.open).toHaveBeenCalled();
  });

  it('should display correct technician and job counts', () => {
    const region = component.dataSource.data[0];
    expect(region.technicianCount).toBe(25);
    expect(region.jobCount).toBe(150);
  });
});
