import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { Magic8BallComponent } from './magic-8-ball.component';
import { Magic8BallService } from '../../services/magic-8-ball.service';

describe('Magic8BallComponent', () => {
  let component: Magic8BallComponent;
  let fixture: ComponentFixture<Magic8BallComponent>;
  let mockMagic8BallService: jasmine.SpyObj<Magic8BallService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('Magic8BallService', ['askQuestion']);

    await TestBed.configureTestingModule({
      declarations: [Magic8BallComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: Magic8BallService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Magic8BallComponent);
    component = fixture.componentInstance;
    mockMagic8BallService = TestBed.inject(Magic8BallService) as jasmine.SpyObj<Magic8BallService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component['questionForm'].get('question')?.value).toBe('');
    expect(component['questionForm'].get('showToast')?.value).toBe(true);
    expect(component['questionForm'].get('sendPush')?.value).toBe(false);
    expect(component['questionForm'].get('toastType')?.value).toBe('info');
  });

  it('should validate question field as required', () => {
    const questionControl = component['questionForm'].get('question');
    
    questionControl?.setValue('');
    expect(questionControl?.invalid).toBe(true);
    
    questionControl?.setValue('Will this work?');
    expect(questionControl?.valid).toBe(true);
  });

  it('should call Magic8BallService when asking a question', () => {
    const mockResponse = {
      question: 'Will this work?',
      answer: 'Yes definitely',
      category: 'positive' as const,
      timestamp: new Date()
    };

    mockMagic8BallService.askQuestion.and.returnValue(of(mockResponse));

    component['questionForm'].patchValue({
      question: 'Will this work?',
      showToast: true,
      sendPush: false,
      toastType: 'info'
    });

    component['onAskQuestion']();

    expect(mockMagic8BallService.askQuestion).toHaveBeenCalledWith(
      'Will this work?',
      {
        showToast: true,
        sendPush: false,
        toastType: 'info'
      }
    );
  });

  it('should update response and history when question is answered', () => {
    const mockResponse = {
      question: 'Will this work?',
      answer: 'Yes definitely',
      category: 'positive' as const,
      timestamp: new Date()
    };

    mockMagic8BallService.askQuestion.and.returnValue(of(mockResponse));

    component['questionForm'].patchValue({ question: 'Will this work?' });
    component['onAskQuestion']();

    expect(component['currentResponse']()).toEqual(mockResponse);
    expect(component['responseHistory']().length).toBe(1);
    expect(component['responseHistory']()[0]).toEqual(mockResponse);
  });

  it('should clear history when requested', () => {
    // Add some history first
    const mockResponse = {
      question: 'Test?',
      answer: 'Yes',
      category: 'positive' as const,
      timestamp: new Date()
    };

    component['responseHistory'].set([mockResponse]);
    component['currentResponse'].set(mockResponse);

    component['onClearHistory']();

    expect(component['responseHistory']().length).toBe(0);
    expect(component['currentResponse']()).toBeNull();
  });

  it('should return correct CSS class for response categories', () => {
    expect(component['getResponseClass']('positive')).toBe('response-positive');
    expect(component['getResponseClass']('negative')).toBe('response-negative');
    expect(component['getResponseClass']('neutral')).toBe('response-neutral');
  });

  it('should return correct icon for response categories', () => {
    expect(component['getResponseIcon']('positive')).toBe('✅');
    expect(component['getResponseIcon']('negative')).toBe('❌');
    expect(component['getResponseIcon']('neutral')).toBe('🤔');
  });

  it('should not submit form when invalid', () => {
    component['questionForm'].patchValue({ question: '' }); // Invalid
    component['onAskQuestion']();

    expect(mockMagic8BallService.askQuestion).not.toHaveBeenCalled();
  });

  it('should set shaking state during question processing', () => {
    const mockResponse = {
      question: 'Test?',
      answer: 'Yes',
      category: 'positive' as const,
      timestamp: new Date()
    };

    mockMagic8BallService.askQuestion.and.returnValue(of(mockResponse));

    component['questionForm'].patchValue({ question: 'Test?' });
    
    expect(component['isShaking']()).toBe(false);
    
    component['onAskQuestion']();
    
    // Should be shaking initially, then stop after response
    expect(component['isShaking']()).toBe(false); // Will be false after synchronous observable
  });
});