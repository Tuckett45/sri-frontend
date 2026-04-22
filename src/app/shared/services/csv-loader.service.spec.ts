import { TestBed } from '@angular/core/testing';
import { CsvLoaderService } from './csv-loader.service';

describe('CsvLoaderService', () => {
  let service: CsvLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CsvLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load PapaParse library', async () => {
    const papa = await service.loadPapaParse();
    expect(papa).toBeDefined();
    expect(papa.parse).toBeDefined();
  });

  it('should cache PapaParse import promise', async () => {
    const firstLoad = service.loadPapaParse();
    const secondLoad = service.loadPapaParse();
    
    // Should return the same promise
    expect(firstLoad).toBe(secondLoad);
  });

  it('should parse CSV string to JSON', async () => {
    const csvString = 'name,age\nJohn,30\nJane,25';
    const result = await service.parseCSV(csvString);
    
    expect(result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 }
    ]);
  });

  it('should handle empty CSV', async () => {
    const csvString = '';
    const result = await service.parseCSV(csvString);
    
    expect(result).toEqual([]);
  });

  it('should convert JSON to CSV string', async () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 }
    ];
    
    const csv = await service.unparseCSV(data);
    
    expect(csv).toContain('name');
    expect(csv).toContain('age');
    expect(csv).toContain('John');
    expect(csv).toContain('Jane');
  });

  it('should handle empty array for unparse', async () => {
    const data: any[] = [];
    const csv = await service.unparseCSV(data);
    
    expect(csv).toBe('');
  });
});
