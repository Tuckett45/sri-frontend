import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TimecardEntryComponent } from './timecard-entry.component';
import { TimecardEntry, TimecardStatus } from '../../../models/timecard.model';

describe('TimecardEntryComponent', () => {
  let component: TimecardEntryComponent;
  let fixture: ComponentFixture<TimecardEntryComponent>;

  const createEntry = (overrides: Partial<TimecardEntry> = {}): TimecardEntry => ({
    id: 'tc-1',
    technicianId: 'tech-1',
    jobId: 'job-1',
    clockIn: new Date('2024-01-15T08:00:00'),
    clockOut: new Date('2024-01-15T10:22:00'),
    actualHours: 2.3667,
    roundedHours: 2.5,
    roundingDifference: 0.1333,
    status: TimecardStatus.Submitted,
    createdAt: new Date('2024-01-15T10:22:00'),
    updatedAt: new Date('2024-01-15T10:22:00'),
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimecardEntryComponent],
      imports: [
        NoopAnimationsModule,
        MatCardModule,
        MatIconModule,
        MatTooltipModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimecardEntryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.entry = createEntry();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('actualHours', () => {
    it('should return actualHours from entry when available', () => {
      component.entry = createEntry({ actualHours: 3.5 });
      expect(component.actualHours).toBe(3.5);
    });

    it('should calculate hours from clockIn/clockOut when actualHours is undefined', () => {
      const entry = createEntry({
        clockIn: new Date('2024-01-15T08:00:00'),
        clockOut: new Date('2024-01-15T10:30:00')
      });
      (entry as any).actualHours = undefined;
      component.entry = entry;
      expect(component.actualHours).toBe(2.5);
    });
  });

  describe('roundedHours', () => {
    it('should return roundedHours from entry when available', () => {
      component.entry = createEntry({ roundedHours: 2.5 });
      expect(component.roundedHours).toBe(2.5);
    });

    it('should calculate rounded hours when roundedHours is undefined', () => {
      const entry = createEntry({
        actualHours: 2.3667
      });
      (entry as any).roundedHours = undefined;
      component.entry = entry;
      // 2.3667 hrs = 142 min -> ceil(142/15)*15 = 150 min = 2.5 hrs
      expect(component.roundedHours).toBe(2.5);
    });
  });

  describe('roundingDifference', () => {
    it('should return roundingDifference from entry when available', () => {
      component.entry = createEntry({ roundingDifference: 0.1333 });
      expect(component.roundingDifference).toBeCloseTo(0.1333, 3);
    });

    it('should calculate difference when roundingDifference is undefined', () => {
      const entry = createEntry({
        roundedHours: 2.5,
        actualHours: 2.3667
      });
      (entry as any).roundingDifference = undefined;
      component.entry = entry;
      expect(component.roundingDifference).toBeCloseTo(0.1333, 3);
    });
  });

  describe('hasRounding', () => {
    it('should return true when rounding was applied', () => {
      component.entry = createEntry({ roundingDifference: 0.1333 });
      expect(component.hasRounding).toBe(true);
    });

    it('should return false when no rounding was needed', () => {
      component.entry = createEntry({ roundingDifference: 0 });
      expect(component.hasRounding).toBe(false);
    });
  });

  describe('roundingDifferenceMinutes', () => {
    it('should convert rounding difference to minutes', () => {
      component.entry = createEntry({ roundingDifference: 0.25 });
      expect(component.roundingDifferenceMinutes).toBe(15);
    });

    it('should return 0 when no rounding', () => {
      component.entry = createEntry({ roundingDifference: 0 });
      expect(component.roundingDifferenceMinutes).toBe(0);
    });
  });

  describe('getStatusClass', () => {
    it('should return correct class for each status', () => {
      component.entry = createEntry();
      expect(component.getStatusClass(TimecardStatus.Approved)).toBe('status-approved');
      expect(component.getStatusClass(TimecardStatus.Submitted)).toBe('status-submitted');
      expect(component.getStatusClass(TimecardStatus.Rejected)).toBe('status-rejected');
      expect(component.getStatusClass(TimecardStatus.Draft)).toBe('status-draft');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct label for each status', () => {
      component.entry = createEntry();
      expect(component.getStatusLabel(TimecardStatus.Approved)).toBe('Approved');
      expect(component.getStatusLabel(TimecardStatus.Submitted)).toBe('Submitted');
      expect(component.getStatusLabel(TimecardStatus.Rejected)).toBe('Rejected');
      expect(component.getStatusLabel(TimecardStatus.Draft)).toBe('Draft');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      component.entry = createEntry();
      const result = component.formatTime(new Date('2024-01-15T14:30:00'));
      expect(result).toContain('2:30');
      expect(result).toContain('PM');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      component.entry = createEntry();
      const result = component.formatDate(new Date('2024-01-15T08:00:00'));
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('rounding logic (15-minute intervals)', () => {
    it('should round up 2h 22m to 2h 30m (Req 3.2)', () => {
      const entry = createEntry({
        clockIn: new Date('2024-01-15T08:00:00'),
        clockOut: new Date('2024-01-15T10:22:00')
      });
      (entry as any).actualHours = undefined;
      (entry as any).roundedHours = undefined;
      component.entry = entry;
      // 142 min -> ceil(142/15)*15 = 150 min = 2.5 hrs
      expect(component.roundedHours).toBe(2.5);
    });

    it('should preserve exact 15-minute intervals (Req 3.3)', () => {
      const entry = createEntry({
        clockIn: new Date('2024-01-15T08:00:00'),
        clockOut: new Date('2024-01-15T10:30:00')
      });
      (entry as any).actualHours = undefined;
      (entry as any).roundedHours = undefined;
      component.entry = entry;
      // 150 min -> ceil(150/15)*15 = 150 min = 2.5 hrs
      expect(component.roundedHours).toBe(2.5);
    });

    it('should round up 1 minute past interval (Req 3.2)', () => {
      const entry = createEntry({
        clockIn: new Date
('2024-01-15T08:00:00'),
        clockOut: new Date('2024-01-15T09:01:00')
      });
      (entry as any).actualHours = undefined;
      (entry as any).roundedHours = undefined;
      component.entry = entry;
      // 61 min -> ceil(61/15)*15 = 75 min = 1.25 hrs
      expect(component.roundedHours).toBe(1.25);
    });
  });

  describe('template rendering', () => {
    it('should display actual and rounded hours (Req 3.5)', () => {
      component.entry = createEntry({
        actualHours: 2.3667,
        roundedHours: 2.5
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const hoursRows = compiled.querySelectorAll('.hours-row');
      expect(hoursRows.length).toBe(2);

      const actualRow = compiled.querySelector('.actual-hours');
      expect(actualRow?.textContent).toContain('Actual Time');

      const roundedRow = compiled.querySelector('.rounded-hours');
      expect(roundedRow?.textContent).toContain('Rounded Time');
    });

    it('should show rounding indicator when rounding applied', () => {
      component.entry = createEntry({ roundingDifference: 0.1333 });
      component.showDetails = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('.rounding-badge.has-rounding');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('Rounded up');
      expect(badge?.textContent).toContain('15-min interval');
    });

    it('should show no-rounding indicator when exact interval', () => {
      component.entry = createEntry({ roundingDifference: 0 });
      component.showDetails = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('.rounding-badge.no-rounding');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('no rounding applied');
    });

    it('should show budget note when rounding applied (Req 3.6)', () => {
      component.entry = createEntry({
        roundedHours: 2.5,
        roundingDifference: 0.1333
      });
      component.showDetails = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const budgetNote = compiled.querySelector('.budget-note');
      expect(budgetNote).toBeTruthy();
      expect(budgetNote?.textContent).toContain('budget deductions and payroll');
    });

    it('should not show budget note when no rounding', () => {
      component.entry = createEntry({ roundingDifference: 0 });
      component.showDetails = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const budgetNote = compiled.querySelector('.budget-note');
      expect(budgetNote).toBeFalsy();
    });

    it('should highlight rounded hours row when rounding applied', () => {
      component.entry = createEntry({ roundingDifference: 0.1333 });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const roundedRow = compiled.querySelector('.rounded-hours.highlighted');
      expect(roundedRow).toBeTruthy();
    });

    it('should display status chip with correct class', () => {
      component.entry = createEntry({ status: TimecardStatus.Approved });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const chip = compiled.querySelector('.status-chip.status-approved');
      expect(chip).toBeTruthy();
      expect(chip?.textContent?.trim()).toBe('Approved');
    });

    it('should hide details when showDetails is false', () => {
      component.entry = createEntry({ roundingDifference: 0.1333 });
      component.showDetails = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.rounding-indicator')).toBeFalsy();
      expect(compiled.querySelector('.budget-note')).toBeFalsy();
    });
  });
});
