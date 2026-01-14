import { TestBed } from '@angular/core/testing';
import { Magic8BallService } from './magic-8-ball.service';
import { NotificationIntegratorService, NotificationDeliveryResult } from './notification-integrator.service';

describe('Magic8BallService', () => {
  let service: Magic8BallService;
  let mockNotificationIntegrator: jasmine.SpyObj<NotificationIntegratorService>;

  beforeEach(() => {
    const notificationSpy = jasmine.createSpyObj('NotificationIntegratorService', ['sendNotification']);

    TestBed.configureTestingModule({
      providers: [
        Magic8BallService,
        { provide: NotificationIntegratorService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(Magic8BallService);
    mockNotificationIntegrator = TestBed.inject(NotificationIntegratorService) as jasmine.SpyObj<NotificationIntegratorService>;
    
    // Default mock behavior - successful notification delivery
    const successResult: NotificationDeliveryResult = {
      success: true,
      toastDelivered: true,
      pushDelivered: false,
      errors: []
    };
    mockNotificationIntegrator.sendNotification.and.returnValue(Promise.resolve(successResult));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return all possible responses', () => {
    const allResponses = service.getAllResponses();
    expect(allResponses.length).toBeGreaterThan(0);
    expect(allResponses).toContain('It is certain');
    expect(allResponses).toContain('My reply is no');
    expect(allResponses).toContain('Ask again later');
  });

  it('should return responses by category', () => {
    const positiveResponses = service.getResponsesByCategory('positive');
    const negativeResponses = service.getResponsesByCategory('negative');
    const neutralResponses = service.getResponsesByCategory('neutral');

    expect(positiveResponses.length).toBeGreaterThan(0);
    expect(negativeResponses.length).toBeGreaterThan(0);
    expect(neutralResponses.length).toBeGreaterThan(0);

    expect(positiveResponses).toContain('It is certain');
    expect(negativeResponses).toContain('My reply is no');
    expect(neutralResponses).toContain('Ask again later');
  });

  it('should generate a response with correct structure', (done) => {
    const question = 'Will this test pass?';
    
    service.askQuestion(question).subscribe(response => {
      expect(response.question).toBe(question);
      expect(response.answer).toBeTruthy();
      expect(['positive', 'negative', 'neutral']).toContain(response.category);
      expect(response.timestamp).toBeInstanceOf(Date);
      done();
    });
  });

  it('should send notification when showToast is enabled', (done) => {
    const question = 'Test question?';
    const options = { showToast: true, toastType: 'info' as const };

    service.askQuestion(question, options).subscribe(response => {
      setTimeout(() => {
        expect(mockNotificationIntegrator.sendNotification).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: 'magic-8-ball',
            message: jasmine.stringContaining(question)
          }),
          jasmine.objectContaining({
            showToast: true,
            toastType: 'info'
          })
        );
        done();
      }, 0);
    });
  });

  it('should not send notification when both showToast and sendPush are false', (done) => {
    const question = 'Test question?';
    const options = { showToast: false, sendPush: false };

    service.askQuestion(question, options).subscribe(response => {
      setTimeout(() => {
        expect(mockNotificationIntegrator.sendNotification).not.toHaveBeenCalled();
        done();
      }, 0);
    });
  });

  it('should send push notification when enabled', (done) => {
    const question = 'Test question?';
    const options = { sendPush: true };

    service.askQuestion(question, options).subscribe(response => {
      setTimeout(() => {
        expect(mockNotificationIntegrator.sendNotification).toHaveBeenCalledWith(
          jasmine.any(Object),
          jasmine.objectContaining({
            sendPush: true
          })
        );
        done();
      }, 0);
    });
  });

  it('should use different toast types correctly', (done) => {
    const question = 'Test question?';
    
    service.askQuestion(question, { showToast: true, toastType: 'success' }).subscribe(() => {
      setTimeout(() => {
        expect(mockNotificationIntegrator.sendNotification).toHaveBeenCalledWith(
          jasmine.any(Object),
          jasmine.objectContaining({
            toastType: 'success'
          })
        );
        done();
      }, 0);
    });
  });

  it('should trim question text', (done) => {
    const question = '  Will this work?  ';
    
    service.askQuestion(question).subscribe(response => {
      expect(response.question).toBe('Will this work?');
      done();
    });
  });

  it('should always return response even when notification fails', (done) => {
    // Mock notification failure
    mockNotificationIntegrator.sendNotification.and.returnValue(
      Promise.reject(new Error('Notification failed'))
    );

    const question = 'Will this work?';
    
    service.askQuestion(question, { showToast: true }).subscribe(response => {
      expect(response.question).toBe(question);
      expect(response.answer).toBeTruthy();
      expect(['positive', 'negative', 'neutral']).toContain(response.category);
      done();
    });
  });

  it('should generate different responses for the same question', (done) => {
    const question = 'Will this be random?';
    const responses: string[] = [];
    let completed = 0;

    // Ask the same question multiple times
    for (let i = 0; i < 10; i++) {
      service.askQuestion(question).subscribe(response => {
        responses.push(response.answer);
        completed++;
        
        if (completed === 10) {
          // Should have some variation (not all identical)
          const uniqueResponses = new Set(responses);
          expect(uniqueResponses.size).toBeGreaterThan(1);
          done();
        }
      });
    }
  });
});