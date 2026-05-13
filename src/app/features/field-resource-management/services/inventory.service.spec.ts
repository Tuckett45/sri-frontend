import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InventoryService } from './inventory.service';
import { CacheService } from './cache.service';
import { 
  InventoryItem, 
  InventoryLocationHistory, 
  InventoryFilters,
  InventoryCategory,
  LocationType,
  InventoryStatus,
  InventoryLocation
} from '../models/inventory.model';
import { CreateInventoryItemDto } from '../models/dtos/inventory.dto';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;
  let cacheService: CacheService;

  const mockLocation: InventoryLocation = {
    type: LocationType.Warehouse,
    id: 'warehouse-1',
    name: 'Main Warehouse',
    assignedAt: new Date('2024-01-01')
  };

  const mockInventoryItem: InventoryItem = {
    id: 'item-123',
    itemNumber: 'TOOL-001',
    name: 'Power Drill',
    description: 'Cordless power drill with battery',
    category: InventoryCategory.Tools,
    currentLocation: mockLocation,
    quantity: 5,
    unitCost: 150.00,
    totalValue: 750.00,
    minimumThreshold: 2,
    serialNumber: 'SN-12345',
    manufacturer: 'DeWalt',
    model: 'DCD771C2',
    purchaseDate: new Date('2023-01-15'),
    warrantyExpiration: new Date('2025-01-15'),
    status: InventoryStatus.Available,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-01')
  };

  const mockLocationHistory: InventoryLocationHistory = {
    id: 'history-123',
    inventoryItemId: 'item-123',
    fromLocation: null,
    toLocation: mockLocation,
    movedBy: 'user-123',
    movedByName: 'John Admin',
    reason: 'Initial stock',
    timestamp: new Date('2023-01-15')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InventoryService,
        CacheService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(CacheService);
  });

  afterEach(() => {
    cacheService.clearAll();
    httpMock.verify();
  });

  describe('getInventory', () => {
    it('should retrieve all inventory items without filters', () => {
      const mockItems = [mockInventoryItem];

      service.getInventory().subscribe(items => {
        expect(items).toEqual(mockItems);
        expect(items.length).toBe(1);
        expect(items[0].itemNumber).toBe('TOOL-001');
      });

      const req = httpMock.expectOne('/api/inventory');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockItems);
    });

    it('should retrieve inventory items with search filter', () => {
      const filters: InventoryFilters = { searchTerm: 'drill' };

      service.getInventory(filters).subscribe(items => {
        expect(items.length).toBe(1);
      });

      const req = httpMock.expectOne(r => r.url === '/api/inventory' && r.params.has('search'));
      expect(req.request.params.get('search')).toBe('drill');
      req.flush([mockInventoryItem]);
    });

    it('should retrieve inventory items with category filter', () => {
      const filters: InventoryFilters = { category: InventoryCategory.Tools };

      service.getInventory(filters).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/inventory' && r.params.has('category'));
      expect(req.request.params.get('category')).toBe('tools');
      req.flush([mockInventoryItem]);
    });

    it('should retrieve inventory items with location type filter', () => {
      const filters: InventoryFilters = { locationType: LocationType.Job };

      service.getInventory(filters).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/inventory' && r.params.has('locationType'));
      expect(req.request.params.get('locationType')).toBe('job');
      req.flush([]);
    });

    it('should retrieve inventory items with location ID filter', () => {
      const filters: InventoryFilters = { locationId: 'job-123' };

      service.getInventory(filters).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/inventory' && r.params.has('locationId'));
      expect(req.request.params.get('locationId')).toBe('job-123');
      req.flush([]);
    });

    it('should retrieve inventory items with status filter', () => {
      const filters: InventoryFilters = { status: InventoryStatus.Available };

      service.getInventory(filters).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/inventory' && r.params.has('status'));
      expect(req.request.params.get('status')).toBe('available');
      req.flush([mockInventoryItem]);
    });

    it('should retrieve inventory items with low stock filter', () => {
      const filters: InventoryFilters = { lowStock: true };

      service.getInventory(filters).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/inventory' && r.params.has('lowStock'));
      expect(req.request.params.get('lowStock')).toBe('true');
      req.flush([]);
    });

    it('should retrieve inventory items with multiple filters', () => {
      const filters: InventoryFilters = {
        searchTerm: 'drill',
        category: InventoryCategory.Tools,
        status: InventoryStatus.Available
      };

      service.getInventory(filters).subscribe();

      const req = httpMock.expectOne(r => 
        r.url === '/api/inventory' && 
        r.params.has('search') && 
        r.params.has('category') && 
        r.params.has('status')
      );
      expect(req.request.params.get('search')).toBe('drill');
      expect(req.request.params.get('category')).toBe('tools');
      expect(req.request.params.get('status')).toBe('available');
      req.flush([mockInventoryItem]);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getInventory().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Inventory item not found');
          expect(callCount).toBe(3); // Initial + 2 retries
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory');
        callCount++;
        req.flush(null, { status: 404, statusText: 'Not Found' });
      }
    });

    it('should handle empty result set', () => {
      service.getInventory().subscribe(items => {
        expect(items).toEqual([]);
        expect(items.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/inventory');
      req.flush([]);
    });
  });

  describe('getInventoryItem', () => {
    it('should retrieve a single inventory item', () => {
      service.getInventoryItem('item-123').subscribe(item => {
        expect(item).toEqual(mockInventoryItem);
        expect(item.id).toBe('item-123');
        expect(item.name).toBe('Power Drill');
      });

      const req = httpMock.expectOne('/api/inventory/item-123');
      expect(req.request.method).toBe('GET');
      req.flush(mockInventoryItem);
    });

    it('should handle 404 error for non-existent item', () => {
      service.getInventoryItem('nonexistent').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Inventory item not found');
        }
      });

      // getInventoryItem uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory/nonexistent');
        req.flush(null, { status: 404, statusText: 'Not Found' });
      }
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getInventoryItem('item-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory/item-123');
        callCount++;
        req.flush(null, { status: 500, statusText: 'Server Error' });
      }
    });
  });

  describe('createInventoryItem', () => {
    it('should create a new inventory item', () => {
      const createDto: CreateInventoryItemDto = {
        itemNumber: 'TOOL-002',
        name: 'Impact Driver',
        description: 'Cordless impact driver',
        category: InventoryCategory.Tools,
        quantity: 3,
        unitCost: 120.00,
        minimumThreshold: 1,
        serialNumber: 'SN-67890',
        manufacturer: 'Milwaukee',
        model: 'M18'
      };

      const createdItem: InventoryItem = {
        ...mockInventoryItem,
        id: 'item-456',
        itemNumber: createDto.itemNumber,
        name: createDto.name,
        description: createDto.description,
        quantity: createDto.quantity,
        unitCost: createDto.unitCost,
        totalValue: 360.00
      };

      service.createInventoryItem(createDto).subscribe(item => {
        expect(item.id).toBe('item-456');
        expect(item.itemNumber).toBe('TOOL-002');
        expect(item.name).toBe('Impact Driver');
      });

      const req = httpMock.expectOne('/api/inventory');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(createdItem);
    });

    it('should handle 400 error for invalid data', () => {
      const invalidDto: CreateInventoryItemDto = {
        itemNumber: '',
        name: '',
        description: '',
        category: InventoryCategory.Tools,
        quantity: -1,
        unitCost: -10,
        minimumThreshold: 0
      };

      service.createInventoryItem(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid inventory data');
        }
      });

      const requests = httpMock.match('/api/inventory');
      requests.forEach(req => req.flush(null, { status: 400, statusText: 'Bad Request' }));
    });

    it('should handle 403 error for insufficient permissions', () => {
      const createDto: CreateInventoryItemDto = {
        itemNumber: 'TOOL-002',
        name: 'Impact Driver',
        description: 'Cordless impact driver',
        category: InventoryCategory.Tools,
        quantity: 3,
        unitCost: 120.00,
        minimumThreshold: 1
      };

      service.createInventoryItem(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Insufficient permissions');
        }
      });

      const requests = httpMock.match('/api/inventory');
      requests.forEach(req => req.flush(null, { status: 403, statusText: 'Forbidden' }));
    });
  });

  describe('assignToJob', () => {
    it('should assign inventory item to a job', () => {
      const jobLocation: InventoryLocation = {
        type: LocationType.Job,
        id: 'job-123',
        name: 'Installation Project',
        assignedAt: new Date()
      };

      const assignedItem: InventoryItem = {
        ...mockInventoryItem,
        currentLocation: jobLocation,
        status: InventoryStatus.Assigned
      };

      service.assignToJob('item-123', 'job-123', 'Needed for installation').subscribe(item => {
        expect(item.currentLocation.type).toBe(LocationType.Job);
        expect(item.currentLocation.id).toBe('job-123');
        expect(item.status).toBe(InventoryStatus.Assigned);
      });

      const req = httpMock.expectOne('/api/inventory/item-123/assign');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.locationType).toBe(LocationType.Job);
      expect(req.request.body.locationId).toBe('job-123');
      expect(req.request.body.reason).toBe('Needed for installation');
      req.flush(assignedItem);
    });

    it('should assign inventory item to a job without reason', () => {
      const jobLocation: InventoryLocation = {
        type: LocationType.Job,
        id: 'job-456',
        name: 'Repair Project',
        assignedAt: new Date()
      };

      const assignedItem: InventoryItem = {
        ...mockInventoryItem,
        currentLocation: jobLocation,
        status: InventoryStatus.Assigned
      };

      service.assignToJob('item-123', 'job-456').subscribe(item => {
        expect(item.currentLocation.id).toBe('job-456');
      });

      const req = httpMock.expectOne('/api/inventory/item-123/assign');
      expect(req.request.body.reason).toBeUndefined();
      req.flush(assignedItem);
    });

    it('should handle 409 error when item is not available', () => {
      service.assignToJob('item-123', 'job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Item not available - already assigned or in use');
        }
      });

      const requests = httpMock.match('/api/inventory/item-123/assign');
      requests.forEach(req => req.flush(null, { status: 409, statusText: 'Conflict' }));
    });

    it('should handle 404 error for non-existent item', () => {
      service.assignToJob('nonexistent', 'job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Inventory item not found');
        }
      });

      const requests = httpMock.match('/api/inventory/nonexistent/assign');
      requests.forEach(req => req.flush(null, { status: 404, statusText: 'Not Found' }));
    });
  });

  describe('assignToTechnician', () => {
    it('should assign inventory item to a technician', () => {
      const techLocation: InventoryLocation = {
        type: LocationType.Technician,
        id: 'tech-123',
        name: 'John Technician',
        assignedAt: new Date()
      };

      const assignedItem: InventoryItem = {
        ...mockInventoryItem,
        currentLocation: techLocation,
        status: InventoryStatus.Assigned
      };

      service.assignToTechnician('item-123', 'tech-123', 'Personal tool assignment').subscribe(item => {
        expect(item.currentLocation.type).toBe(LocationType.Technician);
        expect(item.currentLocation.id).toBe('tech-123');
        expect(item.status).toBe(InventoryStatus.Assigned);
      });

      const req = httpMock.expectOne('/api/inventory/item-123/assign');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.locationType).toBe(LocationType.Technician);
      expect(req.request.body.locationId).toBe('tech-123');
      expect(req.request.body.reason).toBe('Personal tool assignment');
      req.flush(assignedItem);
    });

    it('should assign inventory item to a technician without reason', () => {
      const techLocation: InventoryLocation = {
        type: LocationType.Technician,
        id: 'tech-456',
        name: 'Jane Technician',
        assignedAt: new Date()
      };

      const assignedItem: InventoryItem = {
        ...mockInventoryItem,
        currentLocation: techLocation,
        status: InventoryStatus.Assigned
      };

      service.assignToTechnician('item-123', 'tech-456').subscribe(item => {
        expect(item.currentLocation.id).toBe('tech-456');
      });

      const req = httpMock.expectOne('/api/inventory/item-123/assign');
      expect(req.request.body.reason).toBeUndefined();
      req.flush(assignedItem);
    });

    it('should handle 409 error when item is not available', () => {
      service.assignToTechnician('item-123', 'tech-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Item not available - already assigned or in use');
        }
      });

      const requests = httpMock.match('/api/inventory/item-123/assign');
      requests.forEach(req => req.flush(null, { status: 409, statusText: 'Conflict' }));
    });
  });

  describe('assignToVendor', () => {
    it('should assign inventory item to a vendor', () => {
      const vendorLocation: InventoryLocation = {
        type: LocationType.Vendor,
        id: 'vendor-123',
        name: 'Repair Vendor Inc',
        assignedAt: new Date()
      };

      const assignedItem: InventoryItem = {
        ...mockInventoryItem,
        currentLocation: vendorLocation,
        status: InventoryStatus.Maintenance
      };

      service.assignToVendor('item-123', 'vendor-123', 'Sent for repair').subscribe(item => {
        expect(item.currentLocation.type).toBe(LocationType.Vendor);
        expect(item.currentLocation.id).toBe('vendor-123');
        expect(item.status).toBe(InventoryStatus.Maintenance);
      });

      const req = httpMock.expectOne('/api/inventory/item-123/assign');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.locationType).toBe(LocationType.Vendor);
      expect(req.request.body.locationId).toBe('vendor-123');
      expect(req.request.body.reason).toBe('Sent for repair');
      req.flush(assignedItem);
    });

    it('should assign inventory item to a vendor without reason', () => {
      const vendorLocation: InventoryLocation = {
        type: LocationType.Vendor,
        id: 'vendor-456',
        name: 'Calibration Services',
        assignedAt: new Date()
      };

      const assignedItem: InventoryItem = {
        ...mockInventoryItem,
        currentLocation: vendorLocation,
        status: InventoryStatus.Maintenance
      };

      service.assignToVendor('item-123', 'vendor-456').subscribe(item => {
        expect(item.currentLocation.id).toBe('vendor-456');
      });

      const req = httpMock.expectOne('/api/inventory/item-123/assign');
      expect(req.request.body.reason).toBeUndefined();
      req.flush(assignedItem);
    });

    it('should handle 409 error when item is not available', () => {
      service.assignToVendor('item-123', 'vendor-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Item not available - already assigned or in use');
        }
      });

      const requests = httpMock.match('/api/inventory/item-123/assign');
      requests.forEach(req => req.flush(null, { status: 409, statusText: 'Conflict' }));
    });
  });

  describe('getLocationHistory', () => {
    it('should retrieve location history for an item', () => {
      const history = [mockLocationHistory];

      service.getLocationHistory('item-123').subscribe(entries => {
        expect(entries).toEqual(history);
        expect(entries.length).toBe(1);
        expect(entries[0].inventoryItemId).toBe('item-123');
      });

      const req = httpMock.expectOne('/api/inventory/item-123/history');
      expect(req.request.method).toBe('GET');
      req.flush(history);
    });

    it('should return empty array when no history exists', () => {
      service.getLocationHistory('item-123').subscribe(entries => {
        expect(entries).toEqual([]);
        expect(entries.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/inventory/item-123/history');
      req.flush([]);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getLocationHistory('item-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory/item-123/history');
        callCount++;
        req.flush(null, { status: 500, statusText: 'Server Error' });
      }
    });

    it('should handle 404 error for non-existent item', () => {
      service.getLocationHistory('nonexistent').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Inventory item not found');
        }
      });

      // getLocationHistory uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory/nonexistent/history');
        req.flush(null, { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('checkAvailability', () => {
    it('should return true when item is available', () => {
      service.checkAvailability('item-123').subscribe(available => {
        expect(available).toBe(true);
      });

      const req = httpMock.expectOne('/api/inventory/item-123/availability');
      expect(req.request.method).toBe('GET');
      req.flush(true);
    });

    it('should return false when item is not available', () => {
      service.checkAvailability('item-456').subscribe(available => {
        expect(available).toBe(false);
      });

      const req = httpMock.expectOne('/api/inventory/item-456/availability');
      req.flush(false);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.checkAvailability('item-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory/item-123/availability');
        callCount++;
        req.flush(null, { status: 500, statusText: 'Server Error' });
      }
    });

    it('should handle 404 error for non-existent item', () => {
      service.checkAvailability('nonexistent').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Inventory item not found');
        }
      });

      // checkAvailability uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory/nonexistent/availability');
        req.flush(null, { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('getLowStockItems', () => {
    it('should retrieve low stock items', () => {
      const lowStockItem: InventoryItem = {
        ...mockInventoryItem,
        quantity: 1,
        minimumThreshold: 2
      };

      service.getLowStockItems().subscribe(items => {
        expect(items.length).toBe(1);
        expect(items[0].quantity).toBeLessThanOrEqual(items[0].minimumThreshold);
      });

      const req = httpMock.expectOne('/api/inventory/low-stock');
      expect(req.request.method).toBe('GET');
      req.flush([lowStockItem]);
    });

    it('should return empty array when no low stock items', () => {
      service.getLowStockItems().subscribe(items => {
        expect(items).toEqual([]);
        expect(items.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/inventory/low-stock');
      req.flush([]);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getLowStockItems().subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory/low-stock');
        callCount++;
        req.flush(null, { status: 500, statusText: 'Server Error' });
      }
    });
  });

  describe('error handling', () => {
    it('should handle 500 server error', () => {
      service.getInventory().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Server error: 500');
        }
      });

      // getInventory uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory');
        req.flush(null, { status: 500, statusText: 'Internal Server Error' });
      }
    });

    it('should handle network error', () => {
      service.getInventory().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('error');
        }
      });

      // getInventory uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory');
        req.error(new ProgressEvent('error'));
      }
    });

    it('should handle unknown status code', () => {
      service.getInventory().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Server error: 418');
        }
      });

      // getInventory uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/inventory');
        req.flush(null, { status: 418, statusText: "I'm a teapot" });
      }
    });
  });

  describe('getInventoryByLocations', () => {
    it('should return empty map for empty locations array', () => {
      service.getInventoryByLocations([]).subscribe(result => {
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(0);
      });
    });

    it('should batch query inventory for multiple locations', () => {
      const locations = [
        { locationType: LocationType.Job, locationId: 'job-1' },
        { locationType: LocationType.Warehouse, locationId: 'wh-1' }
      ];

      const jobItem: InventoryItem = {
        ...mockInventoryItem,
        id: 'item-job',
        currentLocation: { type: LocationType.Job, id: 'job-1', name: 'Job 1', assignedAt: new Date() }
      };

      const warehouseItem: InventoryItem = {
        ...mockInventoryItem,
        id: 'item-wh',
        currentLocation: { type: LocationType.Warehouse, id: 'wh-1', name: 'Warehouse 1', assignedAt: new Date() }
      };

      service.getInventoryByLocations(locations).subscribe(result => {
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(2);
        expect(result.get('job:job-1')!.length).toBe(1);
        expect(result.get('job:job-1')![0].id).toBe('item-job');
        expect(result.get('warehouse:wh-1')!.length).toBe(1);
        expect(result.get('warehouse:wh-1')![0].id).toBe('item-wh');
      });

      const req1 = httpMock.expectOne(r =>
        r.url === '/api/inventory' &&
        r.params.get('locationType') === 'job' &&
        r.params.get('locationId') === 'job-1'
      );
      const req2 = httpMock.expectOne(r =>
        r.url === '/api/inventory' &&
        r.params.get('locationType') === 'warehouse' &&
        r.params.get('locationId') === 'wh-1'
      );

      req1.flush([jobItem]);
      req2.flush([warehouseItem]);
    });

    it('should handle a single location', () => {
      const locations = [
        { locationType: LocationType.Technician, locationId: 'tech-1' }
      ];

      service.getInventoryByLocations(locations).subscribe(result => {
        expect(result.size).toBe(1);
        expect(result.has('technician:tech-1')).toBe(true);
      });

      const req = httpMock.expectOne(r =>
        r.url === '/api/inventory' &&
        r.params.get('locationType') === 'technician' &&
        r.params.get('locationId') === 'tech-1'
      );
      req.flush([mockInventoryItem]);
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple concurrent requests', (done) => {
      let completedRequests = 0;
      const checkDone = () => {
        completedRequests++;
        if (completedRequests === 3) {
          done();
        }
      };

      service.getInventoryItem('item-1').subscribe({
        next: (item) => {
          expect(item.id).toBe('item-1');
          checkDone();
        },
        error: done.fail
      });

      service.getInventoryItem('item-2').subscribe({
        next: (item) => {
          expect(item.id).toBe('item-2');
          checkDone();
        },
        error: done.fail
      });

      service.getInventoryItem('item-3').subscribe({
        next: (item) => {
          expect(item.id).toBe('item-3');
          checkDone();
        },
        error: done.fail
      });

      const req1 = httpMock.expectOne('/api/inventory/item-1');
      const req2 = httpMock.expectOne('/api/inventory/item-2');
      const req3 = httpMock.expectOne('/api/inventory/item-3');

      req1.flush({ ...mockInventoryItem, id: 'item-1' });
      req2.flush({ ...mockInventoryItem, id: 'item-2' });
      req3.flush({ ...mockInventoryItem, id: 'item-3' });
    });
  });
});
