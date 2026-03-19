/**
 * Notification Effects Unit Tests
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { NotificationEffects } from './notification.effects';
import { NotificationService } from '../../services/notification.service';
import * as NotificationActions from './notification.actions';
import { Notification, NotificationType } from '../../models/notification.model';

describe('NotificationEffects', () => {
  let actions$: Observable<any>;
  let effects: NotificationEffects;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      type: NotificationType.JobAssignment,
      message: 'New job assigned',
      isRead: false,
      createdAt: new Date('2024-01-01'),
      timestamp: new Date('2024-01-01'),
      userId: 'user-123'
    },
    {
      id: 'notif-2',
      type: NotificationType.JobStatusChange,
      message: 'Job status changed',
      isRead: true,
      createdAt: new Date('2024-01-02'),
      timestamp: new Date('2024-01-02'),
      userId: 'user-123'
    }
  ];

  beforeEach(() => {
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'getNotifications',
      'markAsRead',
      'markAllAsRead'
    ]);

    TestBed.configureTestingModule({
      providers: [
        NotificationEffects,
        provideMockActions(() => actions$),
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    effects = TestBed.inject(NotificationEffects);
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  describe('loadNotifications$', () => {
    it('should return loadNotificationsSuccess action on success', (done) => {
      const userId = 'user-123';
      const action = NotificationActions.loadNotifications({ userId });
      const outcome = NotificationActions.loadNotificationsSuccess({ notifications: mockNotifications });

      actions$ = of(action);
      notificationService.getNotifications.and.returnValue(of(mockNotifications));

      effects.loadNotifications$.subscribe(result => {
        expect(result).toEqual(outcome);
        expect(notificationService.getNotifications).toHaveBeenCalledWith(userId);
        done();
      });
    });

    it('should return loadNotificationsFailure action on error', (done) => {
      const userId = 'user-123';
      const error = new Error('Failed to load');
      const action = NotificationActions.loadNotifications({ userId });
      const outcome = NotificationActions.loadNotificationsFailure({ error: error.message });

      actions$ = of(action);
      notificationService.getNotifications.and.returnValue(throwError(() => error));

      effects.loadNotifications$.subscribe(result => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('markAsRead$', () => {
    it('should return markAsReadSuccess action on success', (done) => {
      const id = 'notif-1';
      const action = NotificationActions.markAsRead({ id });
      const outcome = NotificationActions.markAsReadSuccess({ id });

      actions$ = of(action);
      notificationService.markAsRead.and.returnValue(of(void 0));

      effects.markAsRead$.subscribe(result => {
        expect(result).toEqual(outcome);
        expect(notificationService.markAsRead).toHaveBeenCalledWith(id);
        done();
      });
    });

    it('should return markAsReadFailure action on error', (done) => {
      const id = 'notif-1';
      const error = new Error('Failed to mark as read');
      const action = NotificationActions.markAsRead({ id });
      const outcome = NotificationActions.markAsReadFailure({ error: error.message });

      actions$ = of(action);
      notificationService.markAsRead.and.returnValue(throwError(() => error));

      effects.markAsRead$.subscribe(result => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('markAllAsRead$', () => {
    it('should return markAllAsReadSuccess action on success', (done) => {
      const userId = 'user-123';
      const action = NotificationActions.markAllAsRead({ userId });
      const outcome = NotificationActions.markAllAsReadSuccess();

      actions$ = of(action);
      notificationService.markAllAsRead.and.returnValue(of(void 0));

      effects.markAllAsRead$.subscribe(result => {
        expect(result).toEqual(outcome);
        expect(notificationService.markAllAsRead).toHaveBeenCalledWith(userId);
        done();
      });
    });

    it('should return markAllAsReadFailure action on error', (done) => {
      const userId = 'user-123';
      const error = new Error('Failed to mark all as read');
      const action = NotificationActions.markAllAsRead({ userId });
      const outcome = NotificationActions.markAllAsReadFailure({ error: error.message });

      actions$ = of(action);
      notificationService.markAllAsRead.and.returnValue(throwError(() => error));

      effects.markAllAsRead$.subscribe(result => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });
});
