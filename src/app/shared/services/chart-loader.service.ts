import { Injectable } from '@angular/core';

/**
 * Service for dynamically loading Chart.js library
 * This reduces initial bundle size by loading charts only when needed
 */
@Injectable({
  providedIn: 'root'
})
export class ChartLoaderService {
  private chartJsPromise: Promise<typeof import('chart.js')> | null = null;

  /**
   * Dynamically imports Chart.js library
   * Caches the promise to avoid multiple imports
   */
  async loadChartJs(): Promise<typeof import('chart.js')> {
    if (!this.chartJsPromise) {
      this.chartJsPromise = import('chart.js');
    }
    return this.chartJsPromise;
  }

  /**
   * Registers all Chart.js components needed for the application
   */
  async registerChartComponents(): Promise<void> {
    const ChartJS = await this.loadChartJs();
    
    ChartJS.Chart.register(
      ChartJS.CategoryScale,
      ChartJS.LinearScale,
      ChartJS.PointElement,
      ChartJS.LineElement,
      ChartJS.BarElement,
      ChartJS.ArcElement,
      ChartJS.Title,
      ChartJS.Tooltip,
      ChartJS.Legend,
      ChartJS.Filler
    );
  }
}
