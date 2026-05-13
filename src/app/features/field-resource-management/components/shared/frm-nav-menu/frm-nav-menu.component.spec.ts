import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FrmNavMenuComponent } from './frm-nav-menu.component';
import { AuthService } from '../../../../../services/auth.service';
import { UserRole } from '../../../../../models/role.enum';

describe('FrmNavMenuComponent', () => {
  let component: FrmNavMenuComponent;
  let fixture: ComponentFixture<FrmNavMenuComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);

    await TestBed.configureTestingModule({
      declarations: [FrmNavMenuComponent],
      imports: [
        RouterTestingModule,
        MatListModule,
        MatIconModule,
        MatExpansionModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FrmNavMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show all menu items for Admin role', () => {
    authService.isUserInRole.and.returnValue(true);
    
    fixture.detectChanges();

    expect(component.menuItems.length).toBeGreaterThan(0);
  });

  it('should filter menu items for Dispatcher role', () => {
    authService.isUserInRole.and.callFake((roles: UserRole[]) => {
      return roles.includes(UserRole.PM) || roles.includes(UserRole.CM);
    });
    
    fixture.detectChanges();

    const adminItem = component.menuItems.find(item => item.label === 'Admin');
    expect(adminItem).toBeUndefined();
  });

  it('should show only daily view for Technician role', () => {
    authService.isUserInRole.and.callFake((roles: UserRole[]) => {
      return roles.includes(UserRole.Technician);
    });
    
    fixture.detectChanges();

    const dailyViewItem = component.menuItems.find(item => item.label === 'My Daily Schedule');
    expect(dailyViewItem).toBeDefined();
    
    const scheduleItem = component.menuItems.find(item => item.label === 'Schedule');
    expect(scheduleItem).toBeUndefined();
  });

  it('should filter children menu items based on role', () => {
    authService.isUserInRole.and.callFake((roles: UserRole[]) => {
      return roles.includes(UserRole.Admin);
    });
    
    fixture.detectChanges();

    const reportsItem = component.menuItems.find(item => item.label === 'Reports');
    expect(reportsItem).toBeDefined();
    expect(reportsItem?.children).toBeDefined();
    expect(reportsItem?.children?.length).toBeGreaterThan(0);
  });
});
