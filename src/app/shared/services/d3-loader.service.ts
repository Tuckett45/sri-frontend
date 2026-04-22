import { Injectable } from '@angular/core';

/**
 * Service for dynamically loading D3.js modules
 * This reduces initial bundle size by loading only required D3 modules
 */
@Injectable({
  providedIn: 'root'
})
export class D3LoaderService {
  private d3SelectionPromise: Promise<typeof import('d3-selection')> | null = null;
  private d3ScalePromise: Promise<typeof import('d3-scale')> | null = null;
  private d3ShapePromise: Promise<typeof import('d3-shape')> | null = null;
  private d3AxisPromise: Promise<typeof import('d3-axis')> | null = null;
  private d3ArrayPromise: Promise<typeof import('d3-array')> | null = null;

  /**
   * Load D3 selection module (for DOM manipulation)
   */
  async loadSelection(): Promise<typeof import('d3-selection')> {
    if (!this.d3SelectionPromise) {
      this.d3SelectionPromise = import('d3-selection');
    }
    return this.d3SelectionPromise;
  }

  /**
   * Load D3 scale module (for scales)
   */
  async loadScale(): Promise<typeof import('d3-scale')> {
    if (!this.d3ScalePromise) {
      this.d3ScalePromise = import('d3-scale');
    }
    return this.d3ScalePromise;
  }

  /**
   * Load D3 shape module (for shapes like lines, areas, arcs)
   */
  async loadShape(): Promise<typeof import('d3-shape')> {
    if (!this.d3ShapePromise) {
      this.d3ShapePromise = import('d3-shape');
    }
    return this.d3ShapePromise;
  }

  /**
   * Load D3 axis module (for axes)
   */
  async loadAxis(): Promise<typeof import('d3-axis')> {
    if (!this.d3AxisPromise) {
      this.d3AxisPromise = import('d3-axis');
    }
    return this.d3AxisPromise;
  }

  /**
   * Load D3 array module (for data manipulation)
   */
  async loadArray(): Promise<typeof import('d3-array')> {
    if (!this.d3ArrayPromise) {
      this.d3ArrayPromise = import('d3-array');
    }
    return this.d3ArrayPromise;
  }

  /**
   * Load common D3 modules needed for basic charts
   * Returns an object with all loaded modules
   */
  async loadBasicChartModules(): Promise<{
    selection: typeof import('d3-selection');
    scale: typeof import('d3-scale');
    shape: typeof import('d3-shape');
    axis: typeof import('d3-axis');
    array: typeof import('d3-array');
  }> {
    const [selection, scale, shape, axis, array] = await Promise.all([
      this.loadSelection(),
      this.loadScale(),
      this.loadShape(),
      this.loadAxis(),
      this.loadArray()
    ]);

    return { selection, scale, shape, axis, array };
  }
}
