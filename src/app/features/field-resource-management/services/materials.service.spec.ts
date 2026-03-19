import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MaterialsService } from './materials.service';
import {
  Material,
  MaterialTransaction,
  PurchaseOrder,
  ReorderRecommendation,
  Supplier,
  MaterialCategory,
  TransactionType,
  PurchaseOrderStatus,
  ReorderUrgency,
  ConsumeMaterialDto,
  CreatePurchaseOrderDto,
  CreateMaterialDto
} from '../models/material.model';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let httpMock: HttpTestingController;

  const mockMaterial: Material = {
    id: 'mat-1',
    materialNumber: 'MAT-001',
    name: 'Ethernet Cable',
    description: 'Cat6 Ethernet Cable',
    category: MaterialCategory.Cable,
    unit: 'ft',
    currentQuantity: 500,
    reorderPoint: 200,
    reorderQuantity: 1000,
    unitCost: 0.50,
    preferredSupplierId: 'sup-1',
    alternateSupplierIds: ['sup-2'],
    lastOrderDate: new Date('2024-01-15'),
    lastReceivedDate: new Date('2024-01-20'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  };

  const mockTransaction: MaterialTransaction = {
    id: 'trans-1',
    materialId: 'mat-1',
    transactionType: TransactionType.Consumption,
    quantity: 50,
    unitCost: 0.50,
    totalCost: 25.00,
    jobId: 'job-1',
    supplierId: null,
    purchaseOrderId: null,
    performedBy: 'user-1',
    performedByName: 'John Doe',
    notes: 'Used for job installation',
    timestamp: new Date('2024-02-01')
  };

  const mockPurchaseOrder: PurchaseOrder = {
    id: 'po-1',
    poNumber: 'PO-2024-001',
    supplierId: 'sup-1',
    supplierName: 'Cable Supplier Inc',
    items: [
      {
        materialId: 'mat-1',
        materialName: 'Ethernet Cable',
        quantity: 1000,
        unitCost: 0.50,
        totalCost: 500.00
      }
    ],
    totalAmount: 500.00,
    status: PurchaseOrderStatus.Draft,
    orderDate: new Date('2024-02-01'),
    expectedDeliveryDate: new Date('2024-02-15'),
    actualDeliveryDate: null,
    createdBy: 'user-1',
    createdByName: 'John Doe',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  };

  const mockSupplier: Supplier = {
    id: 'sup-1',
    name: 'Cable Supplier Inc',
    contactName: 'Jane Smith',
    email: 'jane@cablesupplier.com',
    phone: '555-0100',
    address: {
      street: '123 Supplier St',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75001'
    },
    automationEnabled: true,
    apiEndpoint: 'https://api.cablesupplier.com',
    apiKey: 'encrypted-key',
    leadTimeDays: 7,
    minimumOrderAmount: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockReorderRecommendation: ReorderRecommendation = {
    materialId: 'mat-1',
    materialName: 'Ethernet Cable',
    currentQuantity: 150,
    reorderPoint: 200,
    recommendedQuantity: 1000,
    supplierId: 'sup-1',
    supplierName: 'Cable Supplier Inc',
    estimatedCost: 500.00,
    urgency: ReorderUrgency.Medium
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MaterialsService]
    });

    service = TestBed.inject(MaterialsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getMaterials', () => {
    it('should retrieve all materials', () => {
      const mockMaterials = [mockMaterial];

      service.getMaterials().subscribe(materials => {
        expect(materials).toEqual(mockMaterials);
        expect(materials.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/materials');
      expect(req.request.method).toBe('GET');
      req.flush(mockMaterials);
    });

    it('should retry on failure and then succeed', () => {
      const mockMaterials = [mockMaterial];

      service.getMaterials().subscribe(materials => {
        expect(materials).toEqual(mockMaterials);
      });

      // First attempt fails
      const req1 = httpMock.expectOne('/api/materials');
      req1.flush('Error', { status: 500, statusText: 'Server Error' });

      // Second attempt fails
      const req2 = httpMock.expectOne('/api/materials');
      req2.flush('Error', { status: 500, statusText: 'Server Error' });

      // Third attempt succeeds
      const req3 = httpMock.expectOne('/api/materials');
      req3.flush(mockMaterials);
    });

    it('should handle error after retries', () => {
      service.getMaterials().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        }
      });

      // All attempts fail
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/materials');
        req.flush('Error', { status: 500, statusText: 'Server Error' });
      }
    });
  });

  describe('getMaterial', () => {
    it('should retrieve a specific material', () => {
      service.getMaterial('mat-1').subscribe(material => {
        expect(material).toEqual(mockMaterial);
        expect(material.id).toBe('mat-1');
      });

      const req = httpMock.expectOne('/api/materials/mat-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockMaterial);
    });

    it('should handle 404 error for non-existent material', () => {
      service.getMaterial('invalid-id').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Material or resource not found');
        }
      });

      const req = httpMock.expectOne('/api/materials/invalid-id');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createMaterial', () => {
    it('should create a new material', () => {
      const createDto: CreateMaterialDto = {
        materialNumber: 'MAT-002',
        name: 'Fiber Optic Cable',
        description: 'Single-mode fiber',
        category: MaterialCategory.Cable,
        unit: 'ft',
        currentQuantity: 1000,
        reorderPoint: 300,
        reorderQuantity: 2000,
        unitCost: 1.50,
        preferredSupplierId: 'sup-1'
      };

      const createdMaterial = { ...mockMaterial, ...createDto, id: 'mat-2' };

      service.createMaterial(createDto).subscribe(material => {
        expect(material).toEqual(createdMaterial);
      });

      const req = httpMock.expectOne('/api/materials');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(createdMaterial);
    });

    it('should handle validation error', () => {
      const invalidDto: CreateMaterialDto = {
        materialNumber: '',
        name: '',
        description: '',
        category: MaterialCategory.Cable,
        unit: '',
        currentQuantity: -1,
        reorderPoint: 0,
        reorderQuantity: 0,
        unitCost: 0,
        preferredSupplierId: ''
      };

      service.createMaterial(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid material data');
        }
      });

      const req = httpMock.expectOne('/api/materials');
      req.flush('Invalid data', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('consumeMaterial', () => {
    it('should consume material and reduce quantity', () => {
      const consumeDto: ConsumeMaterialDto = {
        materialId: 'mat-1',
        jobId: 'job-1',
        quantity: 50,
        notes: 'Installation work'
      };

      service.consumeMaterial(consumeDto).subscribe(transaction => {
        expect(transaction).toEqual(mockTransaction);
        expect(transaction.transactionType).toBe(TransactionType.Consumption);
        expect(transaction.quantity).toBe(50);
      });

      const req = httpMock.expectOne('/api/materials/mat-1/consume');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(consumeDto);
      req.flush(mockTransaction);
    });

    it('should handle insufficient quantity error', () => {
      const consumeDto: ConsumeMaterialDto = {
        materialId: 'mat-1',
        jobId: 'job-1',
        quantity: 10000, // More than available
        notes: 'Too much'
      };

      service.consumeMaterial(consumeDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Insufficient quantity');
        }
      });

      const req = httpMock.expectOne('/api/materials/mat-1/consume');
      req.flush(
        { message: 'Insufficient quantity available' },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('receiveMaterial', () => {
    it('should receive material and increase quantity', () => {
      const receiptTransaction: MaterialTransaction = {
        ...mockTransaction,
        id: 'trans-2',
        transactionType: TransactionType.Receipt,
        quantity: 1000,
        totalCost: 500.00,
        jobId: null,
        supplierId: 'sup-1',
        purchaseOrderId: 'po-1'
      };

      service.receiveMaterial('mat-1', 1000, 'sup-1', 'po-1').subscribe(transaction => {
        expect(transaction).toEqual(receiptTransaction);
        expect(transaction.transactionType).toBe(TransactionType.Receipt);
        expect(transaction.quantity).toBe(1000);
      });

      const req = httpMock.expectOne('/api/materials/mat-1/receive');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        quantity: 1000,
        supplierId: 'sup-1',
        purchaseOrderId: 'po-1'
      });
      req.flush(receiptTransaction);
    });

    it('should receive material without purchase order', () => {
      const receiptTransaction: MaterialTransaction = {
        ...mockTransaction,
        id: 'trans-3',
        transactionType: TransactionType.Receipt,
        quantity: 500,
        supplierId: 'sup-1',
        purchaseOrderId: null
      };

      service.receiveMaterial('mat-1', 500, 'sup-1').subscribe(transaction => {
        expect(transaction.purchaseOrderId).toBeNull();
      });

      const req = httpMock.expectOne('/api/materials/mat-1/receive');
      expect(req.request.body.purchaseOrderId).toBeUndefined();
      req.flush(receiptTransaction);
    });
  });

  describe('getTransactionHistory', () => {
    it('should retrieve transaction history for a material', () => {
      const transactions = [mockTransaction];

      service.getTransactionHistory('mat-1').subscribe(history => {
        expect(history).toEqual(transactions);
        expect(history.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/materials/mat-1/transactions');
      expect(req.request.method).toBe('GET');
      req.flush(transactions);
    });

    it('should return empty array for material with no transactions', () => {
      service.getTransactionHistory('mat-2').subscribe(history => {
        expect(history).toEqual([]);
      });

      const req = httpMock.expectOne('/api/materials/mat-2/transactions');
      req.flush([]);
    });
  });

  describe('getMaterialsByJob', () => {
    it('should retrieve materials used for a specific job', () => {
      const jobTransactions = [mockTransaction];

      service.getMaterialsByJob('job-1').subscribe(transactions => {
        expect(transactions).toEqual(jobTransactions);
        expect(transactions[0].jobId).toBe('job-1');
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/materials/transactions' && 
        req.params.get('jobId') === 'job-1'
      );
      expect(req.request.method).toBe('GET');
      req.flush(jobTransactions);
    });
  });

  describe('calculateJobMaterialCost', () => {
    it('should calculate total material cost for a job', () => {
      const transactions: MaterialTransaction[] = [
        { ...mockTransaction, quantity: 50, totalCost: 25.00 },
        { ...mockTransaction, id: 'trans-2', quantity: 30, totalCost: 15.00 },
        { 
          ...mockTransaction, 
          id: 'trans-3', 
          transactionType: TransactionType.Receipt, 
          totalCost: 100.00 
        } // Should be excluded
      ];

      service.calculateJobMaterialCost('job-1').subscribe(totalCost => {
        expect(totalCost).toBe(40.00); // Only consumption transactions
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/materials/transactions' && 
        req.params.get('jobId') === 'job-1'
      );
      req.flush(transactions);
    });

    it('should return 0 for job with no material consumption', () => {
      service.calculateJobMaterialCost('job-2').subscribe(totalCost => {
        expect(totalCost).toBe(0);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/materials/transactions' && 
        req.params.get('jobId') === 'job-2'
      );
      req.flush([]);
    });
  });

  describe('getReorderRecommendations', () => {
    it('should retrieve reorder recommendations with urgency', () => {
      const recommendations = [mockReorderRecommendation];

      service.getReorderRecommendations().subscribe(recs => {
        expect(recs).toEqual(recommendations);
        expect(recs[0].urgency).toBeDefined();
      });

      const req = httpMock.expectOne('/api/materials/reorder-recommendations');
      expect(req.request.method).toBe('GET');
      req.flush(recommendations);
    });

    it('should calculate critical urgency for out of stock', () => {
      const criticalRec = {
        ...mockReorderRecommendation,
        currentQuantity: 0
      };

      service.getReorderRecommendations().subscribe(recs => {
        expect(recs[0].urgency).toBe(ReorderUrgency.Critical);
      });

      const req = httpMock.expectOne('/api/materials/reorder-recommendations');
      req.flush([criticalRec]);
    });

    it('should calculate high urgency for 25% or less', () => {
      const highRec = {
        ...mockReorderRecommendation,
        currentQuantity: 50, // 25% of reorder point (200)
        reorderPoint: 200
      };

      service.getReorderRecommendations().subscribe(recs => {
        expect(recs[0].urgency).toBe(ReorderUrgency.High);
      });

      const req = httpMock.expectOne('/api/materials/reorder-recommendations');
      req.flush([highRec]);
    });

    it('should calculate medium urgency for 50% or less', () => {
      const mediumRec = {
        ...mockReorderRecommendation,
        currentQuantity: 100, // 50% of reorder point (200)
        reorderPoint: 200
      };

      service.getReorderRecommendations().subscribe(recs => {
        expect(recs[0].urgency).toBe(ReorderUrgency.Medium);
      });

      const req = httpMock.expectOne('/api/materials/reorder-recommendations');
      req.flush([mediumRec]);
    });

    it('should calculate low urgency for above 50%', () => {
      const lowRec = {
        ...mockReorderRecommendation,
        currentQuantity: 150, // 75% of reorder point (200)
        reorderPoint: 200
      };

      service.getReorderRecommendations().subscribe(recs => {
        expect(recs[0].urgency).toBe(ReorderUrgency.Low);
      });

      const req = httpMock.expectOne('/api/materials/reorder-recommendations');
      req.flush([lowRec]);
    });
  });

  describe('createPurchaseOrder', () => {
    it('should create a purchase order', () => {
      const createDto: CreatePurchaseOrderDto = {
        supplierId: 'sup-1',
        items: [
          {
            materialId: 'mat-1',
            quantity: 1000,
            unitCost: 0.50
          }
        ],
        expectedDeliveryDate: new Date('2024-02-15')
      };

      service.createPurchaseOrder(createDto).subscribe(po => {
        expect(po).toEqual(mockPurchaseOrder);
        expect(po.status).toBe(PurchaseOrderStatus.Draft);
      });

      const req = httpMock.expectOne('/api/purchase-orders');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockPurchaseOrder);
    });

    it('should handle permission error', () => {
      const createDto: CreatePurchaseOrderDto = {
        supplierId: 'sup-1',
        items: []
      };

      service.createPurchaseOrder(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Insufficient permissions to perform this operation');
        }
      });

      const req = httpMock.expectOne('/api/purchase-orders');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getPurchaseOrder', () => {
    it('should retrieve a purchase order', () => {
      service.getPurchaseOrder('po-1').subscribe(po => {
        expect(po).toEqual(mockPurchaseOrder);
      });

      const req = httpMock.expectOne('/api/purchase-orders/po-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockPurchaseOrder);
    });
  });

  describe('getPurchaseOrders', () => {
    it('should retrieve all purchase orders', () => {
      const orders = [mockPurchaseOrder];

      service.getPurchaseOrders().subscribe(pos => {
        expect(pos).toEqual(orders);
      });

      const req = httpMock.expectOne('/api/purchase-orders');
      expect(req.request.method).toBe('GET');
      req.flush(orders);
    });

    it('should filter purchase orders by status', () => {
      const orders = [mockPurchaseOrder];

      service.getPurchaseOrders(PurchaseOrderStatus.Submitted).subscribe(pos => {
        expect(pos).toEqual(orders);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/purchase-orders' && 
        req.params.get('status') === PurchaseOrderStatus.Submitted
      );
      req.flush(orders);
    });
  });

  describe('updatePurchaseOrderStatus', () => {
    it('should update purchase order status', () => {
      const updatedPO = { ...mockPurchaseOrder, status: PurchaseOrderStatus.Submitted };

      service.updatePurchaseOrderStatus('po-1', PurchaseOrderStatus.Submitted).subscribe(po => {
        expect(po.status).toBe(PurchaseOrderStatus.Submitted);
      });

      const req = httpMock.expectOne('/api/purchase-orders/po-1/status');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: PurchaseOrderStatus.Submitted });
      req.flush(updatedPO);
    });
  });

  describe('submitPurchaseOrderToSupplier', () => {
    it('should submit purchase order to supplier', () => {
      const submittedPO = { ...mockPurchaseOrder, status: PurchaseOrderStatus.Ordered };

      service.submitPurchaseOrderToSupplier('po-1').subscribe(po => {
        expect(po.status).toBe(PurchaseOrderStatus.Ordered);
      });

      const req = httpMock.expectOne('/api/purchase-orders/po-1/submit');
      expect(req.request.method).toBe('POST');
      req.flush(submittedPO);
    });

    it('should handle supplier integration failure', () => {
      service.submitPurchaseOrderToSupplier('po-1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Supplier integration failed');
        }
      });

      const req = httpMock.expectOne('/api/purchase-orders/po-1/submit');
      req.flush('Supplier API unavailable', { status: 502, statusText: 'Bad Gateway' });
    });
  });

  describe('getSuppliers', () => {
    it('should retrieve all suppliers', () => {
      const suppliers = [mockSupplier];

      service.getSuppliers().subscribe(sups => {
        expect(sups).toEqual(suppliers);
      });

      const req = httpMock.expectOne('/api/suppliers');
      expect(req.request.method).toBe('GET');
      req.flush(suppliers);
    });
  });

  describe('getSupplier', () => {
    it('should retrieve a specific supplier', () => {
      service.getSupplier('sup-1').subscribe(supplier => {
        expect(supplier).toEqual(mockSupplier);
      });

      const req = httpMock.expectOne('/api/suppliers/sup-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockSupplier);
    });
  });

  describe('importSupplierInventory', () => {
    it('should import supplier inventory feed', () => {
      const importResult = { imported: 50, updated: 25 };

      service.importSupplierInventory('sup-1').subscribe(result => {
        expect(result).toEqual(importResult);
        expect(result.imported).toBe(50);
        expect(result.updated).toBe(25);
      });

      const req = httpMock.expectOne('/api/suppliers/sup-1/import-inventory');
      expect(req.request.method).toBe('POST');
      req.flush(importResult);
    });

    it('should handle supplier integration failure', () => {
      service.importSupplierInventory('sup-1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Supplier integration failed');
        }
      });

      const req = httpMock.expectOne('/api/suppliers/sup-1/import-inventory');
      req.flush('Supplier API error', { status: 502, statusText: 'Bad Gateway' });
    });
  });

  describe('adjustMaterialInventory', () => {
    it('should adjust material inventory for variance', () => {
      const adjustmentTransaction: MaterialTransaction = {
        ...mockTransaction,
        id: 'trans-adj',
        transactionType: TransactionType.Adjustment,
        quantity: -10,
        notes: 'Variance correction'
      };

      service.adjustMaterialInventory('mat-1', -10, 'Variance correction').subscribe(transaction => {
        expect(transaction.transactionType).toBe(TransactionType.Adjustment);
        expect(transaction.quantity).toBe(-10);
      });

      const req = httpMock.expectOne('/api/materials/mat-1/adjust');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ quantity: -10, reason: 'Variance correction' });
      req.flush(adjustmentTransaction);
    });
  });

  describe('calculateMaterialCostVariance', () => {
    it('should calculate cost variance for a job', () => {
      const transactions: MaterialTransaction[] = [
        { ...mockTransaction, totalCost: 25.00 },
        { ...mockTransaction, id: 'trans-2', totalCost: 35.00 }
      ];
      const estimatedCost = 50.00;
      const actualCost = 60.00;

      service.calculateMaterialCostVariance('job-1', estimatedCost).subscribe(variance => {
        expect(variance.actualCost).toBe(actualCost);
        expect(variance.variance).toBe(10.00);
        expect(variance.variancePercent).toBe(20.00);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/materials/transactions' && 
        req.params.get('jobId') === 'job-1'
      );
      req.flush(transactions);
    });

    it('should handle zero estimated cost', () => {
      const transactions: MaterialTransaction[] = [
        { ...mockTransaction, totalCost: 25.00 }
      ];

      service.calculateMaterialCostVariance('job-1', 0).subscribe(variance => {
        expect(variance.variancePercent).toBe(0);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/materials/transactions' && 
        req.params.get('jobId') === 'job-1'
      );
      req.flush(transactions);
    });
  });

  describe('getMaterialUsageReport', () => {
    it('should retrieve material usage report', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockReport = { totalUsage: 1000, byMaterial: [] };

      service.getMaterialUsageReport(startDate, endDate).subscribe(report => {
        expect(report).toEqual(mockReport);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/materials/usage-report' &&
        req.params.has('startDate') &&
        req.params.has('endDate')
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockReport);
    });

    it('should filter report by job type', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockReport = { totalUsage: 500, byMaterial: [] };

      service.getMaterialUsageReport(startDate, endDate, 'installation').subscribe(report => {
        expect(report).toEqual(mockReport);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/materials/usage-report' &&
        req.params.get('jobType') === 'installation'
      );
      req.flush(mockReport);
    });
  });

  describe('getTransactionHistoryBatch', () => {
    it('should return empty map for empty materialIds array', () => {
      service.getTransactionHistoryBatch([]).subscribe(result => {
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(0);
      });
    });

    it('should batch query transactions for multiple materials', () => {
      const materialIds = ['mat-1', 'mat-2'];

      const trans1: MaterialTransaction = {
        ...mockTransaction,
        materialId: 'mat-1'
      };
      const trans2: MaterialTransaction = {
        ...mockTransaction,
        id: 'trans-2',
        materialId: 'mat-2',
        quantity: 30,
        totalCost: 15.00
      };

      service.getTransactionHistoryBatch(materialIds).subscribe(result => {
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(2);
        expect(result.get('mat-1')!.length).toBe(1);
        expect(result.get('mat-1')![0].materialId).toBe('mat-1');
        expect(result.get('mat-2')!.length).toBe(1);
        expect(result.get('mat-2')![0].materialId).toBe('mat-2');
      });

      const req1 = httpMock.expectOne('/api/materials/mat-1/transactions');
      const req2 = httpMock.expectOne('/api/materials/mat-2/transactions');

      req1.flush([trans1]);
      req2.flush([trans2]);
    });

    it('should handle a single material ID', () => {
      service.getTransactionHistoryBatch(['mat-1']).subscribe(result => {
        expect(result.size).toBe(1);
        expect(result.has('mat-1')).toBe(true);
      });

      const req = httpMock.expectOne('/api/materials/mat-1/transactions');
      req.flush([mockTransaction]);
    });
  });

  describe('error handling', () => {
    it('should handle 400 Bad Request', () => {
      service.getMaterial('invalid').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid material data');
        }
      });

      const req = httpMock.expectOne('/api/materials/invalid');
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 403 Forbidden', () => {
      service.getMaterial('mat-1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Insufficient permissions to perform this operation');
        }
      });

      const req = httpMock.expectOne('/api/materials/mat-1');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 404 Not Found', () => {
      service.getMaterial('nonexistent').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Material or resource not found');
        }
      });

      const req = httpMock.expectOne('/api/materials/nonexistent');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle client-side errors', () => {
      service.getMaterials().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Error:');
        }
      });

      const req = httpMock.expectOne('/api/materials');
      req.error(new ErrorEvent('Network error', {
        message: 'Connection failed'
      }));
    });
  });
});
