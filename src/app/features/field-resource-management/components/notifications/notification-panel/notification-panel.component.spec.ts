import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NotificationPanelComponent } from './notification-panel.component';
import * as NotificationActions from '../../../state/notifications/notification.actions';
import * as NotificationSelectors from '../../../state/notifications/notification.selectors';
import { Notification } from '../../../models/notification.model';

describe('NotificationPanelComponent', () => {
  let component: NotificationPanelComponent;
  let fixture: ComponentFixture<NotificationPanelComponent>;
  let store: MockStore;

  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'job_assigned',
      message: 'You have been assigned to Job #12345',
      isRead: false,
      createdAt: new Date(),
      timestamp: new Date(),
      userId: 'user1'
    },
    {
      id: '2',
      type: 'job_status_changed',
      message: 'Job #12345 status changed to Completed',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000), // Yesterday
      timestamp: new Date(Date.now() - 86400000),
      userId: 'user1'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NotificationPanelComponent ],
      imports: [
        MatMenuModule,
        MatIconModule,
        MatBadgeModule,
        MatButtonModule,
        MatDividerModule,
        RouterTestingModule
      ],
      providers: [
        provideMockStore({
          selectors: [
            { selector: NotificationSelectors.selectAllNotifications, value: mockNotifications },
            { selector: NotificationSelectors.selectUnreadCount, value: 1 }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(NotificationPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadNotifications on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(NotificationActions.loadNotifications({ userId: 'test-user-id' }));
  });

  it('should group notifications by date', () => {
    expect(component.groupedNotifications['Today'].length).toBeGreaterThan(0);
    expect(component.groupedNotifications['Yesterday'].length).toBeGreaterThan(0);
  });

  it('should dispatch markAsRead when unread notification is clicked', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    const unreadNotification = mockNotifications[0];
    component.onNotificationClick(unreadNotification);
    expect(dispatchSpy).toHaveBeenCalledWith(
      NotificationActions.markAsRead({ id: unreadNotification.id })
    );
  });

  it('should not dispatch markAsRead when read notification is clicked', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    const readNotification = mockNotifications[1];
    component.onNotificationClick(readNotification);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should dispatch markAllAsRead', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onMarkAllAsRead();
    expect(dispatchSpy).toHaveBeenCalledWith(NotificationActions.markAllAsRead({ userId: 'test-user-id' }));
  });

  it('should return correct icon for notification type', () => {
    expect(component.getNotificationIcon('job_assigned')).toBe('assignment');
    expect(component.getNotificationIcon('job_status_changed')).toBe('update');
    expect(component.getNotificationIcon('unknown_type')).toBe('notifications');
  });
});
