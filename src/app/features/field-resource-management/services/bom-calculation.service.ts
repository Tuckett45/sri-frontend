import { Injectable } from '@angular/core';
import { BomLineItem, BomTotals, LaborLineItem, LaborTotals } from '../models/quote-workflow.model';

/**
 * Pure calculation service for BOM financial computations.
 *
 * All methods are stateless — they take data and configuration as input
 * and return computed values with no side effects.
 */
@Injectable({
  providedIn: 'root'
})
export class BomCalculationService {

  /**
   * Computes extended cost for a single BOM line item.
   * @param quantity Positive integer quantity
   * @param unitCost Positive unit cost (up to 2 decimal places)
   * @returns quantity × unitCost, rounded to 2 decimal places
   */
  computeExtendedCost(quantity: number, unitCost: number): number {
    return Math.round(quantity * unitCost * 100) / 100;
  }

  /**
   * Computes marked-up cost from an extended cost and markup percentage.
   * @param extendedCost Non-negative extended cost
   * @param markupPercentage Markup percentage in [0, 100]
   * @returns extendedCost × (1 + markupPercentage / 100), rounded to 2 decimal places
   */
  computeMarkedUpCost(extendedCost: number, markupPercentage: number): number {
    return Math.round(extendedCost * (1 + markupPercentage / 100) * 100) / 100;
  }

  /**
   * Computes the subtotal as the sum of all marked-up extended costs.
   * @param lineItems Array of BOM line items
   * @param markupPercentage Markup percentage in [0, 100]
   * @returns Sum of marked-up extended costs for all line items, rounded to 2 decimal places
   */
  computeSubtotal(lineItems: BomLineItem[], markupPercentage: number): number {
    const subtotal = lineItems.reduce((sum, item) => {
      const extendedCost = this.computeExtendedCost(item.quantity, item.unitCost);
      const markedUpCost = this.computeMarkedUpCost(extendedCost, markupPercentage);
      return sum + markedUpCost;
    }, 0);
    return Math.round(subtotal * 100) / 100;
  }

  /**
   * Computes the grand total as subtotal + tax + freight.
   * @param subtotal Non-negative subtotal
   * @param tax Non-negative tax amount
   * @param freight Non-negative freight amount
   * @returns subtotal + tax + freight, rounded to 2 decimal places
   */
  computeGrandTotal(subtotal: number, tax: number, freight: number): number {
    return Math.round((subtotal + tax + freight) * 100) / 100;
  }

  /**
   * Computes all BOM totals from raw line items and configuration.
   * @param lineItems Array of BOM line items
   * @param markupPercentage Markup percentage in [0, 100]
   * @param tax Non-negative tax amount
   * @param freight Non-negative freight amount
   * @returns BomTotals with subtotal, tax, freight, and grandTotal
   */
  computeBomTotals(
    lineItems: BomLineItem[],
    markupPercentage: number,
    tax: number,
    freight: number
  ): BomTotals {
    const subtotal = this.computeSubtotal(lineItems, markupPercentage);
    const grandTotal = this.computeGrandTotal(subtotal, tax, freight);
    return {
      subtotal,
      tax,
      freight,
      grandTotal
    };
  }

  /**
   * Computes labor totals from job summary line items.
   * @param lineItems Array of labor line items
   * @returns LaborTotals with totalHours and totalCost
   */
  computeLaborTotal(lineItems: LaborLineItem[]): LaborTotals {
    const totalHours = lineItems.reduce(
      (sum, item) => sum + item.estimatedHours,
      0
    );
    const totalCost = lineItems.reduce(
      (sum, item) => sum + Math.round(item.estimatedHours * item.hourlyRate * 100) / 100,
      0
    );
    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100
    };
  }
}
