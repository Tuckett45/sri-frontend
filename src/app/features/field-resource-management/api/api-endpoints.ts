/**
 * API Endpoints Configuration
 * 
 * Centralized definition of all API endpoints for the Field Resource Management module.
 * This provides a single source of truth for API URLs and helps maintain consistency.
 * 
 * Requirements: 1.1-1.7, 2.1-2.8, 4.1-4.7, 5.1-5.9, 6.1-6.11, 7.1-7.13, 9.1-9.6, 10.1-10.6, 11.1-11.7, 12.1-12.10
 */

/**
 * Base API URL - can be configured per environment
 */
export const API_BASE_URL = '/api';

/**
 * Budget API Endpoints
 * Requirements: 1.1-1.7, 2.1-2.8
 */
export const BUDGET_ENDPOINTS = {
  /** GET /api/budgets/job/:jobId - Get budget for a job */
  getBudget: (jobId: string) => `${API_BASE_URL}/budgets/job/${jobId}`,
  
  /** POST /api/budgets - Create a new budget */
  createBudget: () => `${API_BASE_URL}/budgets`,
  
  /** POST /api/budgets/:jobId/adjustments - Create a budget adjustment */
  createAdjustment: (jobId: string) => `${API_BASE_URL}/budgets/${jobId}/adjustments`,
  
  /** GET /api/budgets/:jobId/adjustments - Get budget adjustment history */
  getAdjustments: (jobId: string) => `${API_BASE_URL}/budgets/${jobId}/adjustments`,
  
  /** POST /api/budgets/:jobId/deductions - Create a budget deduction */
  createDeduction: (jobId: string) => `${API_BASE_URL}/budgets/${jobId}/deductions`,
  
  /** GET /api/budgets/:jobId/deductions - Get budget deduction history */
  getDeductions: (jobId: string) => `${API_BASE_URL}/budgets/${jobId}/deductions`,
} as const;

/**
 * Travel API Endpoints
 * Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6
 */
export const TRAVEL_ENDPOINTS = {
  /** GET /api/travel/profiles/:technicianId - Get travel profile */
  getProfile: (technicianId: string) => `${API_BASE_URL}/travel/profiles/${technicianId}`,
  
  /** PATCH /api/travel/profiles/:technicianId/flag - Update travel flag */
  updateFlag: (technicianId: string) => `${API_BASE_URL}/travel/profiles/${technicianId}/flag`,
  
  /** PATCH /api/travel/profiles/:technicianId/address - Update home address */
  updateAddress: (technicianId: string) => `${API_BASE_URL}/travel/profiles/${technicianId}/address`,
  
  /** PATCH /api/travel/profiles/:technicianId/coordinates - Update geocoded coordinates */
  updateCoordinates: (technicianId: string) => `${API_BASE_URL}/travel/profiles/${technicianId}/coordinates`,
  
  /** PATCH /api/travel/profiles/:technicianId/geocoding-status - Update geocoding status */
  updateGeocodingStatus: (technicianId: string) => `${API_BASE_URL}/travel/profiles/${technicianId}/geocoding-status`,
  
  /** POST /api/travel/calculate-distances - Calculate distances for job assignment */
  calculateDistances: () => `${API_BASE_URL}/travel/calculate-distances`,
} as const;

/**
 * Inventory API Endpoints
 * Requirements: 6.1-6.11, 10.1-10.6
 */
export const INVENTORY_ENDPOINTS = {
  /** GET /api/inventory - Get inventory items with filtering */
  getInventory: () => `${API_BASE_URL}/inventory`,
  
  /** POST /api/inventory - Create a new inventory item */
  createItem: () => `${API_BASE_URL}/inventory`,
  
  /** GET /api/inventory/:itemId - Get a single inventory item */
  getItem: (itemId: string) => `${API_BASE_URL}/inventory/${itemId}`,
  
  /** POST /api/inventory/:itemId/assign - Assign inventory to location */
  assignItem: (itemId: string) => `${API_BASE_URL}/inventory/${itemId}/assign`,
  
  /** GET /api/inventory/:itemId/history - Get location history */
  getHistory: (itemId: string) => `${API_BASE_URL}/inventory/${itemId}/history`,
  
  /** GET /api/inventory/:itemId/availability - Check availability */
  checkAvailability: (itemId: string) => `${API_BASE_URL}/inventory/${itemId}/availability`,
  
  /** GET /api/inventory/low-stock - Get low stock items */
  getLowStock: () => `${API_BASE_URL}/inventory/low-stock`,
} as const;

/**
 * Materials API Endpoints
 * Requirements: 7.1-7.13, 11.1-11.7
 */
export const MATERIALS_ENDPOINTS = {
  /** GET /api/materials - Get all materials */
  getMaterials: () => `${API_BASE_URL}/materials`,
  
  /** POST /api/materials - Create a new material */
  createMaterial: () => `${API_BASE_URL}/materials`,
  
  /** GET /api/materials/:materialId - Get a single material */
  getMaterial: (materialId: string) => `${API_BASE_URL}/materials/${materialId}`,
  
  /** POST /api/materials/:materialId/consume - Consume material for a job */
  consumeMaterial: (materialId: string) => `${API_BASE_URL}/materials/${materialId}/consume`,
  
  /** POST /api/materials/:materialId/receive - Receive material from supplier */
  receiveMaterial: (materialId: string) => `${API_BASE_URL}/materials/${materialId}/receive`,
  
  /** GET /api/materials/:materialId/transactions - Get transaction history */
  getTransactions: (materialId: string) => `${API_BASE_URL}/materials/${materialId}/transactions`,
  
  /** GET /api/materials/transactions - Get transactions with filters */
  getAllTransactions: () => `${API_BASE_URL}/materials/transactions`,
  
  /** GET /api/materials/reorder-recommendations - Get reorder recommendations */
  getReorderRecommendations: () => `${API_BASE_URL}/materials/reorder-recommendations`,
  
  /** POST /api/materials/:materialId/adjust - Adjust material inventory */
  adjustMaterial: (materialId: string) => `${API_BASE_URL}/materials/${materialId}/adjust`,
  
  /** GET /api/materials/usage-report - Get material usage report */
  getUsageReport: () => `${API_BASE_URL}/materials/usage-report`,
} as const;

/**
 * Purchase Order API Endpoints
 * Requirements: 7.6-7.7, 7.13
 */
export const PURCHASE_ORDER_ENDPOINTS = {
  /** GET /api/purchase-orders - Get all purchase orders */
  getPurchaseOrders: () => `${API_BASE_URL}/purchase-orders`,
  
  /** POST /api/purchase-orders - Create a new purchase order */
  createPurchaseOrder: () => `${API_BASE_URL}/purchase-orders`,
  
  /** GET /api/purchase-orders/:poId - Get a single purchase order */
  getPurchaseOrder: (poId: string) => `${API_BASE_URL}/purchase-orders/${poId}`,
  
  /** PATCH /api/purchase-orders/:poId/status - Update purchase order status */
  updateStatus: (poId: string) => `${API_BASE_URL}/purchase-orders/${poId}/status`,
  
  /** POST /api/purchase-orders/:poId/submit - Submit to supplier */
  submitToSupplier: (poId: string) => `${API_BASE_URL}/purchase-orders/${poId}/submit`,
} as const;

/**
 * Supplier API Endpoints
 * Requirements: 7.2, 7.5, 7.13
 */
export const SUPPLIER_ENDPOINTS = {
  /** GET /api/suppliers - Get all suppliers */
  getSuppliers: () => `${API_BASE_URL}/suppliers`,
  
  /** GET /api/suppliers/:supplierId - Get a single supplier */
  getSupplier: (supplierId: string) => `${API_BASE_URL}/suppliers/${supplierId}`,
  
  /** POST /api/suppliers/:supplierId/import-inventory - Import supplier inventory */
  importInventory: (supplierId: string) => `${API_BASE_URL}/suppliers/${supplierId}/import-inventory`,
} as const;

/**
 * Reporting API Endpoints
 * Requirements: 12.1-12.10
 */
export const REPORTING_ENDPOINTS = {
  /** GET /api/reports/job-cost/:jobId - Get job cost report */
  getJobCostReport: (jobId: string) => `${API_BASE_URL}/reports/job-cost/${jobId}`,
  
  /** GET /api/reports/job-cost/:jobId/export - Export job cost report */
  exportJobCostReport: (jobId: string) => `${API_BASE_URL}/reports/job-cost/${jobId}/export`,
  
  /** GET /api/reports/budget-comparison/:jobId - Get budget comparison */
  getBudgetComparison: (jobId: string) => `${API_BASE_URL}/reports/budget-comparison/${jobId}`,
  
  /** GET /api/reports/budget-variance - Get budget variance report */
  getBudgetVariance: () => `${API_BASE_URL}/reports/budget-variance`,
  
  /** GET /api/reports/travel-costs - Get travel cost report */
  getTravelCosts: () => `${API_BASE_URL}/reports/travel-costs`,
  
  /** GET /api/reports/material-usage - Get material usage report */
  getMaterialUsage: () => `${API_BASE_URL}/reports/material-usage`,
  
  /** GET /api/reports/dashboard - Get dashboard metrics */
  getDashboard: () => `${API_BASE_URL}/reports/dashboard`,
  
  /** GET /api/reports/utilization - Get utilization report */
  getUtilization: () => `${API_BASE_URL}/reports/utilization`,
  
  /** GET /api/reports/performance - Get performance report */
  getPerformance: () => `${API_BASE_URL}/reports/performance`,
  
  /** GET /api/reports/kpis - Get KPIs */
  getKPIs: () => `${API_BASE_URL}/reports/kpis`,
  
  /** GET /api/reports/schedule-adherence - Get schedule adherence */
  getScheduleAdherence: () => `${API_BASE_URL}/reports/schedule-adherence`,
  
  /** GET /api/reports/export/:reportType - Export report */
  exportReport: (reportType: string) => `${API_BASE_URL}/reports/export/${reportType}`,
} as const;
