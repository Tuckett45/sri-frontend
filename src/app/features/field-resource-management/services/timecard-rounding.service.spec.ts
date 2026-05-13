import { TestBed } from '@angular/core/testing';
import { TimecardRoundingService } from './timecard-rounding.service';
import { RoundingMethod } from '../models/timecard.model';

describe('TimecardRoundingService', () => {
  let service: TimecardRoundingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimecardRoundingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('roundHours', () => {
    describe('with RoundUp method (default)', () => {
      beforeEach(() => {
        service.updateConfig({ roundingMethod: RoundingMethod.RoundUp });
      });

      it('should not change hours at exact 15-minute intervals', () => {
        expect(service.roundHours(0.25)).toBe(0.25); // 15 minutes
        expect(service.roundHours(0.5)).toBe(0.5);   // 30 minutes
        expect(service.roundHours(0.75)).toBe(0.75); // 45 minutes
        expect(service.roundHours(1.0)).toBe(1.0);   // 60 minutes
        expect(service.roundHours(2.0)).toBe(2.0);   // 120 minutes
      });

      it('should round up 1-14 minutes past interval', () => {
        expect(service.roundHours(0.01)).toBeCloseTo(0.25, 5);  // 0.6 min -> 15 min
        expect(service.roundHours(0.1)).toBeCloseTo(0.25, 5);   // 6 min -> 15 min
        expect(service.roundHours(0.2)).toBeCloseTo(0.25, 5);   // 12 min -> 15 min
        expect(service.roundHours(0.26)).toBeCloseTo(0.5, 5);   // 15.6 min -> 30 min
        expect(service.roundHours(0.4)).toBeCloseTo(0.5, 5);    // 24 min -> 30 min
        expect(service.roundHours(0.51)).toBeCloseTo(0.75, 5);  // 30.6 min -> 45 min
        expect(service.roundHours(0.76)).toBeCloseTo(1.0, 5);   // 45.6 min -> 60 min
      });

      it('should handle zero hours', () => {
        expect(service.roundHours(0)).toBe(0);
      });

      it('should handle very small values', () => {
        expect(service.roundHours(0.001)).toBeCloseTo(0.25, 5); // 0.06 min -> 15 min
        expect(service.roundHours(0.0001)).toBeCloseTo(0.25, 5); // 0.006 min -> 15 min
      });

      it('should handle large values', () => {
        expect(service.roundHours(8.1)).toBeCloseTo(8.25, 5);   // 486 min -> 495 min
        expect(service.roundHours(10.5)).toBe(10.5);            // 630 min (exact)
        expect(service.roundHours(24.0)).toBe(24.0);            // 1440 min (exact)
      });

      it('should handle fractional hours between intervals', () => {
        expect(service.roundHours(1.1)).toBeCloseTo(1.25, 5);   // 66 min -> 75 min
        expect(service.roundHours(2.3)).toBeCloseTo(2.5, 5);    // 138 min -> 150 min
        expect(service.roundHours(3.7)).toBeCloseTo(3.75, 5);   // 222 min -> 225 min
      });
    });

    describe('with RoundDown method', () => {
      beforeEach(() => {
        service.updateConfig({ roundingMethod: RoundingMethod.RoundDown });
      });

      it('should not change hours at exact 15-minute intervals', () => {
        expect(service.roundHours(0.25)).toBe(0.25);
        expect(service.roundHours(0.5)).toBe(0.5);
        expect(service.roundHours(1.0)).toBe(1.0);
      });

      it('should round down 1-14 minutes past interval', () => {
        expect(service.roundHours(0.26)).toBeCloseTo(0.25, 5);  // 15.6 min -> 15 min
        expect(service.roundHours(0.4)).toBeCloseTo(0.25, 5);   // 24 min -> 15 min
        expect(service.roundHours(0.51)).toBeCloseTo(0.5, 5);   // 30.6 min -> 30 min
        expect(service.roundHours(0.76)).toBeCloseTo(0.75, 5);  // 45.6 min -> 45 min
      });

      it('should round down to zero for values less than interval', () => {
        expect(service.roundHours(0.1)).toBe(0);   // 6 min -> 0 min
        expect(service.roundHours(0.2)).toBe(0);   // 12 min -> 0 min
      });
    });

    describe('with RoundNearest method', () => {
      beforeEach(() => {
        service.updateConfig({ roundingMethod: RoundingMethod.RoundNearest });
      });

      it('should not change hours at exact 15-minute intervals', () => {
        expect(service.roundHours(0.25)).toBe(0.25);
        expect(service.roundHours(0.5)).toBe(0.5);
        expect(service.roundHours(1.0)).toBe(1.0);
      });

      it('should round to nearest interval', () => {
        expect(service.roundHours(0.1)).toBeCloseTo(0, 5);      // 6 min -> 0 min (closer to 0)
        expect(service.roundHours(0.15)).toBeCloseTo(0.25, 5);  // 9 min -> 15 min (closer to 15)
        expect(service.roundHours(0.2)).toBeCloseTo(0.25, 5);   // 12 min -> 15 min (closer to 15)
        expect(service.roundHours(0.3)).toBeCloseTo(0.25, 5);   // 18 min -> 15 min (closer to 15)
        expect(service.roundHours(0.35)).toBeCloseTo(0.25, 5);  // 21 min -> 15 min (closer to 15)
        expect(service.roundHours(0.4)).toBeCloseTo(0.5, 5);    // 24 min -> 30 min (closer to 30)
      });

      it('should round up when exactly halfway', () => {
        // 7.5 minutes is exactly halfway between 0 and 15
        expect(service.roundHours(0.125)).toBeCloseTo(0.25, 5);
        // 22.5 minutes is exactly halfway between 15 and 30
        expect(service.roundHours(0.375)).toBeCloseTo(0.5, 5);
      });
    });
  });

  describe('calculateActualHours', () => {
    it('should calculate hours for same-day timecard', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T17:00:00');
      
      expect(service.calculateActualHours(clockIn, clockOut)).toBe(9);
    });

    it('should calculate hours for partial hours', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T08:30:00');
      
      expect(service.calculateActualHours(clockIn, clockOut)).toBe(0.5);
    });

    it('should calculate hours spanning midnight', () => {
      const clockIn = new Date('2024-01-15T22:00:00');
      const clockOut = new Date('2024-01-16T02:00:00');
      
      expect(service.calculateActualHours(clockIn, clockOut)).toBe(4);
    });

    it('should handle very short durations', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T08:05:00');
      
      expect(service.calculateActualHours(clockIn, clockOut)).toBeCloseTo(0.0833, 4);
    });

    it('should handle long durations', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-16T08:00:00');
      
      expect(service.calculateActualHours(clockIn, clockOut)).toBe(24);
    });

    it('should return zero for same clock in and out times', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T08:00:00');
      
      expect(service.calculateActualHours(clockIn, clockOut)).toBe(0);
    });

    it('should handle fractional hours correctly', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T10:17:00');
      
      expect(service.calculateActualHours(clockIn, clockOut)).toBeCloseTo(2.2833, 4);
    });
  });

  describe('processTimecardEntry', () => {
    beforeEach(() => {
      service.updateConfig({ roundingMethod: RoundingMethod.RoundUp });
    });

    it('should return actual, rounded, and difference for exact interval', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T09:00:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBe(1);
      expect(result.roundedHours).toBe(1);
      expect(result.roundingDifference).toBe(0);
    });

    it('should return actual, rounded, and difference for non-exact interval', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T09:10:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBeCloseTo(1.1667, 4);
      expect(result.roundedHours).toBeCloseTo(1.25, 4);
      expect(result.roundingDifference).toBeCloseTo(0.0833, 4);
    });

    it('should handle typical 8-hour workday with lunch break', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T17:07:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBeCloseTo(9.1167, 4);
      expect(result.roundedHours).toBeCloseTo(9.25, 4);
      expect(result.roundingDifference).toBeCloseTo(0.1333, 4);
    });

    it('should handle short duration', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T08:05:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBeCloseTo(0.0833, 4);
      expect(result.roundedHours).toBeCloseTo(0.25, 4);
      expect(result.roundingDifference).toBeCloseTo(0.1667, 4);
    });

    it('should handle overnight shift', () => {
      const clockIn = new Date('2024-01-15T22:00:00');
      const clockOut = new Date('2024-01-16T06:00:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBe(8);
      expect(result.roundedHours).toBe(8);
      expect(result.roundingDifference).toBe(0);
    });

    it('should handle zero duration', () => {
      const clockIn = new Date('2024-01-15T08:00:00');
      const clockOut = new Date('2024-01-15T08:00:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBe(0);
      expect(result.roundedHours).toBe(0);
      expect(result.roundingDifference).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update interval minutes', () => {
      service.updateConfig({ intervalMinutes: 30 });
      
      const config = service.getConfig();
      expect(config.intervalMinutes).toBe(30);
    });

    it('should update rounding method', () => {
      service.updateConfig({ roundingMethod: RoundingMethod.RoundDown });
      
      const config = service.getConfig();
      expect(config.roundingMethod).toBe(RoundingMethod.RoundDown);
    });

    it('should update both properties', () => {
      service.updateConfig({ 
        intervalMinutes: 30, 
        roundingMethod: RoundingMethod.RoundNearest 
      });
      
      const config = service.getConfig();
      expect(config.intervalMinutes).toBe(30);
      expect(config.roundingMethod).toBe(RoundingMethod.RoundNearest);
    });

    it('should preserve existing config when updating partial config', () => {
      service.updateConfig({ intervalMinutes: 15, roundingMethod: RoundingMethod.RoundUp });
      service.updateConfig({ intervalMinutes: 30 });
      
      const config = service.getConfig();
      expect(config.intervalMinutes).toBe(30);
      expect(config.roundingMethod).toBe(RoundingMethod.RoundUp);
    });

    it('should affect subsequent rounding operations', () => {
      service.updateConfig({ intervalMinutes: 30 });
      
      // 20 minutes should round up to 30 minutes (0.5 hours)
      expect(service.roundHours(0.333)).toBeCloseTo(0.5, 4);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = service.getConfig();
      
      expect(config.intervalMinutes).toBe(15);
      expect(config.roundingMethod).toBe(RoundingMethod.RoundUp);
    });

    it('should return a copy of the configuration', () => {
      const config1 = service.getConfig();
      config1.intervalMinutes = 999;
      
      const config2 = service.getConfig();
      expect(config2.intervalMinutes).toBe(15);
    });
  });

  describe('edge cases', () => {
    it('should handle negative time difference gracefully', () => {
      const clockIn = new Date('2024-01-15T10:00:00');
      const clockOut = new Date('2024-01-15T08:00:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBe(-2);
      expect(result.roundedHours).toBe(-2);
    });

    it('should handle very large hour values', () => {
      const hours = 1000;
      const rounded = service.roundHours(hours);
      
      expect(rounded).toBe(1000);
    });

    it('should handle very small non-zero values', () => {
      const hours = 0.0001; // 0.006 minutes
      const rounded = service.roundHours(hours);
      
      expect(rounded).toBeCloseTo(0.25, 4);
    });

    it('should maintain precision for exact intervals', () => {
      const testValues = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
      
      testValues.forEach(hours => {
        expect(service.roundHours(hours)).toBe(hours);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical morning shift', () => {
      const clockIn = new Date('2024-01-15T06:00:00');
      const clockOut = new Date('2024-01-15T14:17:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBeCloseTo(8.2833, 4);
      expect(result.roundedHours).toBeCloseTo(8.5, 4);
      expect(result.roundingDifference).toBeCloseTo(0.2167, 4);
    });

    it('should handle typical afternoon shift', () => {
      const clockIn = new Date('2024-01-15T14:00:00');
      const clockOut = new Date('2024-01-15T22:03:00');
      
      const result = service.processTimecardEntry(clockIn, clockOut);
      
      expect(result.actualHours).toBeCloseTo(8.05, 4);
      expect(result.roundedHours).toBeCloseTo(8.25, 4);
      expect(result.roundingDifference).toBeCloseTo(0.2, 4);
    });

    it('should handle split shift with multiple entries', () => {
      // Morning portion
      const morning = service.processTimecardEntry(
        new Date('2024-01-15T06:00:00'),
        new Date('2024-01-15T10:00:00')
      );
      
      // Afternoon portion
      const afternoon = service.processTimecardEntry(
        new Date('2024-01-15T14:00:00'),
        new Date('2024-01-15T18:07:00')
      );
      
      const totalActual = morning.actualHours + afternoon.actualHours;
      const totalRounded = morning.roundedHours + afternoon.roundedHours;
      
      expect(totalActual).toBeCloseTo(8.1167, 4);
      expect(totalRounded).toBeCloseTo(8.25, 4);
    });
  });
});
