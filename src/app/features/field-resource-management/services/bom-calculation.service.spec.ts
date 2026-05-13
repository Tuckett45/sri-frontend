import { TestBed } from '@angular/core/testing';
import { BomCalculationService } from './bom-calculation.service';
import { BomLineItem, LaborLineItem } from '../models/quote-workflow.model';

describe('BomCalculationService', () => {
  let service: BomCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BomCalculationService]
    });
    service = TestBed.inject(BomCalculationService);
  });

  // -----------------------------------------------------------------------
  // computeExtendedCost
  // -----------------------------------------------------------------------
  describe('computeExtendedCost', () => {
    it('should compute quantity × unitCost', () => {
      expect(service.computeExtendedCost(10, 25.50)).toBe(255);
    });

    it('should handle single quantity', () => {
      expect(service.computeExtendedCost(1, 99.99)).toBe(99.99);
    });

    it('should round to 2 decimal places', () => {
      // 3 × 1.33 = 3.99
      expect(service.computeExtendedCost(3, 1.33)).toBe(3.99);
    });

    it('should handle large quantities', () => {
      expect(service.computeExtendedCost(1000, 0.01)).toBe(10);
    });

    it('should return 0 when quantity is 0', () => {
      expect(service.computeExtendedCost(0, 50)).toBe(0);
    });

    it('should return 0 when unitCost is 0', () => {
      expect(service.computeExtendedCost(10, 0)).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // computeMarkedUpCost
  // -----------------------------------------------------------------------
  describe('computeMarkedUpCost', () => {
    it('should apply 10% markup', () => {
      expect(service.computeMarkedUpCost(100, 10)).toBe(110);
    });

    it('should apply 0% markup (no change)', () => {
      expect(service.computeMarkedUpCost(100, 0)).toBe(100);
    });

    it('should apply 100% markup (double)', () => {
      expect(service.computeMarkedUpCost(50, 100)).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      // 33.33 × 1.15 = 38.3295 → 38.33
      expect(service.computeMarkedUpCost(33.33, 15)).toBe(38.33);
    });

    it('should handle 0 extended cost', () => {
      expect(service.computeMarkedUpCost(0, 25)).toBe(0);
    });

    it('should handle fractional markup percentage', () => {
      // 100 × 1.125 = 112.50
      expect(service.computeMarkedUpCost(100, 12.5)).toBe(112.5);
    });
  });

  // -----------------------------------------------------------------------
  // computeSubtotal
  // -----------------------------------------------------------------------
  describe('computeSubtotal', () => {
    const makeLineItem = (quantity: number, unitCost: number): BomLineItem => ({
      id: 'item-1',
      materialDescription: 'Test Material',
      quantity,
      unitOfMeasure: 'EA',
      unitCost,
      supplierName: 'Test Supplier',
      extendedCost: 0,
      markedUpCost: 0
    });

    it('should compute subtotal for a single line item', () => {
      const items = [makeLineItem(10, 5)];
      // extended = 50, marked up at 10% = 55
      expect(service.computeSubtotal(items, 10)).toBe(55);
    });

    it('should compute subtotal for multiple line items', () => {
      const items = [
        makeLineItem(2, 10),   // extended = 20, marked up at 10% = 22
        makeLineItem(5, 3)     // extended = 15, marked up at 10% = 16.50
      ];
      expect(service.computeSubtotal(items, 10)).toBe(38.5);
    });

    it('should return 0 for empty line items', () => {
      expect(service.computeSubtotal([], 10)).toBe(0);
    });

    it('should handle 0% markup', () => {
      const items = [makeLineItem(4, 25)]; // extended = 100, no markup = 100
      expect(service.computeSubtotal(items, 0)).toBe(100);
    });
  });

  // -----------------------------------------------------------------------
  // computeGrandTotal
  // -----------------------------------------------------------------------
  describe('computeGrandTotal', () => {
    it('should sum subtotal, tax, and freight', () => {
      expect(service.computeGrandTotal(100, 8.5, 15)).toBe(123.5);
    });

    it('should handle zero tax and freight', () => {
      expect(service.computeGrandTotal(250, 0, 0)).toBe(250);
    });

    it('should round to 2 decimal places', () => {
      // 100.11 + 8.22 + 5.33 = 113.66
      expect(service.computeGrandTotal(100.11, 8.22, 5.33)).toBe(113.66);
    });

    it('should handle zero subtotal', () => {
      expect(service.computeGrandTotal(0, 10, 20)).toBe(30);
    });
  });

  // -----------------------------------------------------------------------
  // computeBomTotals
  // -----------------------------------------------------------------------
  describe('computeBomTotals', () => {
    const makeLineItem = (quantity: number, unitCost: number): BomLineItem => ({
      id: 'item-1',
      materialDescription: 'Test Material',
      quantity,
      unitOfMeasure: 'EA',
      unitCost,
      supplierName: 'Test Supplier',
      extendedCost: 0,
      markedUpCost: 0
    });

    it('should return consistent BomTotals', () => {
      const items = [makeLineItem(10, 10)]; // extended = 100, marked up at 10% = 110
      const totals = service.computeBomTotals(items, 10, 5, 3);

      expect(totals.subtotal).toBe(110);
      expect(totals.tax).toBe(5);
      expect(totals.freight).toBe(3);
      expect(totals.grandTotal).toBe(118);
      expect(totals.grandTotal).toBe(totals.subtotal + totals.tax + totals.freight);
    });

    it('should handle empty line items', () => {
      const totals = service.computeBomTotals([], 10, 5, 3);

      expect(totals.subtotal).toBe(0);
      expect(totals.grandTotal).toBe(8);
    });

    it('should handle zero tax and freight', () => {
      const items = [makeLineItem(5, 20)]; // extended = 100, marked up at 20% = 120
      const totals = service.computeBomTotals(items, 20, 0, 0);

      expect(totals.subtotal).toBe(120);
      expect(totals.grandTotal).toBe(120);
    });
  });

  // -----------------------------------------------------------------------
  // computeLaborTotal
  // -----------------------------------------------------------------------
  describe('computeLaborTotal', () => {
    const makeLaborItem = (hours: number, rate: number): LaborLineItem => ({
      id: 'labor-1',
      taskDescription: 'Test Task',
      laborCategory: 'Electrician',
      estimatedHours: hours,
      hourlyRate: rate
    });

    it('should compute total hours and total cost', () => {
      const items = [
        makeLaborItem(8, 50),   // cost = 400
        makeLaborItem(4, 75)    // cost = 300
      ];
      const totals = service.computeLaborTotal(items);

      expect(totals.totalHours).toBe(12);
      expect(totals.totalCost).toBe(700);
    });

    it('should return zeros for empty line items', () => {
      const totals = service.computeLaborTotal([]);

      expect(totals.totalHours).toBe(0);
      expect(totals.totalCost).toBe(0);
    });

    it('should handle a single line item', () => {
      const items = [makeLaborItem(10, 45.50)];
      const totals = service.computeLaborTotal(items);

      expect(totals.totalHours).toBe(10);
      expect(totals.totalCost).toBe(455);
    });

    it('should round cost to 2 decimal places', () => {
      // 3.33 × 10.11 = 33.6663 → 33.67
      const items = [makeLaborItem(3.33, 10.11)];
      const totals = service.computeLaborTotal(items);

      expect(totals.totalHours).toBe(3.33);
      expect(totals.totalCost).toBe(33.67);
    });

    it('should handle fractional hours', () => {
      const items = [
        makeLaborItem(1.5, 100),  // cost = 150
        makeLaborItem(2.25, 80)   // cost = 180
      ];
      const totals = service.computeLaborTotal(items);

      expect(totals.totalHours).toBe(3.75);
      expect(totals.totalCost).toBe(330);
    });
  });
});
