import { TestBed } from '@angular/core/testing';
import { ChartLoaderService } from './chart-loader.service';

describe('ChartLoaderService', () => {
  let service: ChartLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChartLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load Chart.js library', async () => {
    const chartJs = await service.loadChartJs();
    expect(chartJs).toBeDefined();
    expect(chartJs.Chart).toBeDefined();
  });

  it('should cache Chart.js import promise', async () => {
    const firstLoad = service.loadChartJs();
    const secondLoad = service.loadChartJs();
    
    // Should return the same promise
    expect(firstLoad).toBe(secondLoad);
  });

  it('should register Chart.js components without error', async () => {
    await expectAsync(service.registerChartComponents()).toBeResolved();
  });
});
