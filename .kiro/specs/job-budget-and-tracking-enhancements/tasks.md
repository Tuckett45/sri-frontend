# Implementation Plan: Job Budget and Tracking Enhancements

## Overview

This implementation plan covers the development of comprehensive job budget tracking, timecard rounding, travel management with geocoding, inventory tracking, and materials management with supplier automation. The implementation uses TypeScript with Angular and NgRx for state management, integrating with Azure Maps API for geocoding and distance calculations.

## Tasks

- [x] 1. Set up core data models and interfaces
  - Create TypeScript interfaces for all data models (JobBudget, BudgetAdjustment, TimecardEntry, TravelProfile, InventoryItem, Material, etc.)
  - Create enums for status types (BudgetStatus, TimecardStatus, GeocodingStatus, LocationType, etc.)
  - Create DTO interfaces for API requests
  - _Requirements: 1.1, 2.3-2.6, 3.1, 4.1-4.2, 5.1-5.2, 6.1-6.4, 7.1-7.5_

- [x] 2. Implement Budget Management System
  - [x] 2.1 Create BudgetService with API integration
    - Implement getBudget, createBudget, adjustBudget, deductHours methods
    - Implement budget status calculation logic
    - Add error handling for all budget operations
    - _Requirements: 1.1-1.7, 2.1-2.8_
  
  - [ ]* 2.2 Write property test for budget hour calculation
    - **Property 1: Budget Hour Calculation**
    - **Validates: Requirements 1.2**
  
  - [ ]* 2.3 Write property test for budget adjustment authorization
    - **Property 2: Budget Adjustment Authorization**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ]* 2.4 Write property test for audit trail completeness
    - **Property 3: Budget Adjustment Audit Trail Completeness**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
  
  - [ ]* 2.5 Write property test for budget remaining calculation
    - **Property 4: Budget Remaining Calculation**
    - **Validates: Requirements 1.5**
  
  - [ ]* 2.6 Write property test for budget status determination
    - **Property 7: Budget Status Determination**
    - **Validates: Requirements 1.6**
  
  - [ ]* 2.7 Write property test for budget alert generation
    - **Property 8: Budget Alert Generation at Thresholds**
    - **Validates: Requirements 8.5, 8.6**
  
  - [ ]* 2.8 Write unit tests for BudgetService
    - Test budget creation with valid/invalid data
    - Test error handling for all error types
    - Test concurrent modification scenarios
    - _Requirements: 1.1-1.7, 2.1-2.8_

- [x] 3. Implement Timecard Rounding System
  - [x] 3.1 Create TimecardRoundingService
    - Implement roundHours method with 15-minute interval logic
    - Implement calculateActualHours method
    - Implement processTimecardEntry method
    - Support configurable rounding methods (round up, down, nearest)
    - _Requirements: 3.1-3.7_
  
  - [ ]* 3.2 Write property test for timecard rounding
    - **Property 5: Timecard Rounding to 15 Minutes**
    - **Validates: Requirements 3.2, 3.3**
  
  - [ ]* 3.3 Write property test for rounded time usage in budget deduction
    - **Property 6: Rounded Time Used for Budget Deduction**
    - **Validates: Requirements 3.6, 3.7, 8.1, 8.2**
  
  - [ ]* 3.4 Write unit tests for TimecardRoundingService
    - Test rounding at exact 15-minute intervals
    - Test rounding at 1-14 minutes past interval
    - Test edge cases (0 minutes, very large values)
    - _Requirements: 3.1-3.7_

- [x] 4. Implement Travel Management System
  - [x] 4.1 Create GeocodingService with Azure Maps integration
    - Implement geocodeAddress method
    - Implement calculateDistance method
    - Implement calculateDistancesBatch method for bulk operations
    - Add retry logic and error handling
    - _Requirements: 5.4-5.6, 9.2_
  
  - [x] 4.2 Create TravelService
    - Implement getTravelProfile, updateTravelFlag, updateHomeAddress methods
    - Implement calculateDistancesToJob method
    - Implement calculatePerDiem method
    - Integrate with GeocodingService for address validation
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_
  
  - [ ]* 4.3 Write property test for travel flag valid states
    - **Property 9: Travel Flag Valid States**
    - **Validates: Requirements 4.2**
  
  - [ ]* 4.4 Write property test for home address validation
    - **Property 10: Home Address Validation**
    - **Validates: Requirements 5.2**
  
  - [ ]* 4.5 Write property test for distance calculation symmetry
    - **Property 11: Distance Calculation Symmetry**
    - **Validates: Requirements 5.6, 9.2**
  
  - [ ]* 4.6 Write property test for per diem eligibility threshold
    - **Property 12: Per Diem Eligibility Threshold**
    - **Validates: Requirements 5.7, 9.5**
  
  - [ ]* 4.7 Write unit tests for GeocodingService and TravelService
    - Test address validation with missing fields
    - Test geocoding success and failure scenarios
    - Test distance calculation with valid coordinates
    - Test per diem calculation at various distances
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_

- [~] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Inventory Tracking System
  - [x] 6.1 Create InventoryService
    - Implement getInventory with filtering support
    - Implement assignToJob, assignToTechnician, assignToVendor methods
    - Implement getLocationHistory method
    - Add availability checking logic
    - _Requirements: 6.1-6.11, 10.1-10.6_
  
  - [ ]* 6.2 Write property test for inventory unique identifiers
    - **Property 13: Inventory Item Unique Identifiers**
    - **Validates: Requirements 6.1**
  
  - [ ]* 6.3 Write property test for inventory location update
    - **Property 14: Inventory Location Update on Assignment**
    - **Validates: Requirements 6.5, 6.6, 6.7**
  
  - [ ]* 6.4 Write property test for inventory location history
    - **Property 15: Inventory Location History Accumulation**
    - **Validates: Requirements 6.8**
  
  - [ ]* 6.5 Write property test for inventory filtering correctness
    - **Property 16: Inventory Filtering Correctness**
    - **Validates: Requirements 6.9**
  
  - [ ]* 6.6 Write property test for inventory value calculation
    - **Property 17: Inventory Value Calculation by Location**
    - **Validates: Requirements 6.10**
  
  - [ ]* 6.7 Write property test for low stock alert generation
    - **Property 18: Low Stock Alert Generation**
    - **Validates: Requirements 6.11**
  
  - [ ]* 6.8 Write property test for inventory availability check
    - **Property 25: Inventory Availability Check on Assignment**
    - **Validates: Requirements 10.2, 10.5**
  
  - [ ]* 6.9 Write property test for inventory release on job cancellation
    - **Property 26: Inventory Release on Job Cancellation**
    - **Validates: Requirements 10.6**
  
  - [ ]* 6.10 Write unit tests for InventoryService
    - Test item creation with unique IDs
    - Test assignment to different location types
    - Test availability checking before assignment
    - Test location history recording
    - Test filtering by various criteria
    - _Requirements: 6.1-6.11, 10.1-10.6_

- [x] 7. Implement Materials Management System
  - [x] 7.1 Create MaterialsService
    - Implement getMaterials, consumeMaterial, receiveMaterial methods
    - Implement createPurchaseOrder method
    - Implement getReorderRecommendations method
    - Add supplier integration logic
    - _Requirements: 7.1-7.13, 11.1-11.7_
  
  - [ ]* 7.2 Write property test for material quantity update on receipt
    - **Property 19: Material Quantity Update on Receipt**
    - **Validates: Requirements 7.8**
  
  - [ ]* 7.3 Write property test for material quantity reduction on consumption
    - **Property 20: Material Quantity Reduction on Consumption**
    - **Validates: Requirements 7.9**
  
  - [ ]* 7.4 Write property test for material transaction history
    - **Property 21: Material Transaction History Completeness**
    - **Validates: Requirements 7.10**
  
  - [ ]* 7.5 Write property test for material cost calculation per job
    - **Property 22: Material Cost Calculation per Job**
    - **Validates: Requirements 7.11, 11.2**
  
  - [ ]* 7.6 Write property test for reorder recommendation generation
    - **Property 23: Reorder Recommendation Generation**
    - **Validates: Requirements 7.6**
  
  - [ ]* 7.7 Write property test for material inventory adjustment
    - **Property 27: Material Inventory Adjustment on Consumption Variance**
    - **Validates: Requirements 11.5**
  
  - [ ]* 7.8 Write property test for material cost variance calculation
    - **Property 28: Material Cost Variance Calculation**
    - **Validates: Requirements 11.7**
  
  - [ ]* 7.9 Write unit tests for MaterialsService
    - Test material consumption reducing quantity
    - Test material receipt increasing quantity
    - Test reorder recommendation generation
    - Test purchase order creation
    - Test transaction history recording
    - _Requirements: 7.1-7.13, 11.1-11.7_

- [~] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement NgRx State Management for Budget
  - [x] 9.1 Create budget state slice
    - Define BudgetState interface with EntityAdapter
    - Create budget actions (load, adjust, deduct, success, failure)
    - Implement budget reducer with entity operations
    - Create budget selectors (by job ID, status, history)
    - _Requirements: 1.1-1.7, 2.1-2.8, 8.1-8.6_
  
  - [x] 9.2 Create budget effects
    - Implement loadBudget$ effect
    - Implement adjustBudget$ effect
    - Implement deductHours$ effect
    - Implement budgetAlert$ effect for threshold notifications
    - Add error handling for all effects
    - _Requirements: 1.1-1.7, 2.1-2.8, 8.1-8.6_
  
  - [ ]* 9.3 Write integration tests for budget state management
    - Test budget loading and caching
    - Test budget adjustment flow
    - Test budget deduction on timecard submission
    - Test alert generation at thresholds
    - _Requirements: 1.1-1.7, 2.1-2.8, 8.1-8.6_

- [x] 10. Implement NgRx State Management for Travel
  - [x] 10.1 Create travel state slice
    - Define TravelState interface with EntityAdapter
    - Create travel actions (update flag, update address, calculate distances)
    - Implement travel reducer
    - Create travel selectors (profile, distances, geocoding status)
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_
  
  - [x] 10.2 Create travel effects
    - Implement updateTravelFlag$ effect
    - Implement updateHomeAddress$ effect with geocoding trigger
    - Implement calculateDistances$ effect
    - Add error handling for geocoding failures
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_
  
  - [ ]* 10.3 Write property test for technician distance sorting
    - **Property 24: Technician Distance Sorting**
    - **Validates: Requirements 9.6**
  
  - [ ]* 10.4 Write integration tests for travel state management
    - Test travel flag updates
    - Test home address updates with geocoding
    - Test distance calculations for job assignments
    - Test travel flag filtering
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_

- [x] 11. Implement NgRx State Management for Inventory
  - [x] 11.1 Create inventory state slice
    - Define InventoryState interface with EntityAdapter
    - Create inventory actions (load, assign, filter, alert)
    - Implement inventory reducer
    - Create inventory selectors (all, filtered, by location, low stock)
    - _Requirements: 6.1-6.11, 10.1-10.6_
  
  - [x] 11.2 Create inventory effects
    - Implement loadInventory$ effect
    - Implement assignToJob$ effect
    - Implement assignToTechnician$ effect
    - Implement lowStockAlert$ effect
    - _Requirements: 6.1-6.11, 10.1-10.6_
  
  - [ ]* 11.3 Write integration tests for inventory state management
    - Test inventory loading and filtering
    - Test assignment to different locations
    - Test availability checking
    - Test low stock alert generation
    - _Requirements: 6.1-6.11, 10.1-10.6_

- [x] 12. Implement NgRx State Management for Materials
  - [x] 12.1 Create materials state slice
    - Define MaterialsState interface with EntityAdapter
    - Create materials actions (load, consume, receive, purchase order)
    - Implement materials reducer
    - Create materials selectors (all, by job, reorder recommendations)
    - _Requirements: 7.1-7.13, 11.1-11.7_
  
  - [x] 12.2 Create materials effects
    - Implement loadMaterials$ effect
    - Implement consumeMaterial$ effect
    - Implement receiveMaterial$ effect
    - Implement createPurchaseOrder$ effect
    - Implement reorderAlert$ effect
    - _Requirements: 7.1-7.13, 11.1-11.7_
  
  - [ ]* 12.3 Write integration tests for materials state management
    - Test material consumption flow
    - Test material receipt flow
    - Test purchase order creation
    - Test reorder recommendation generation
    - _Requirements: 7.1-7.13, 11.1-11.7_

- [~] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Budget UI Components
  - [x] 14.1 Create BudgetViewComponent
    - Display job budget with allocated, consumed, and remaining hours
    - Show budget status with color coding (on-track, warning, over-budget)
    - Display budget adjustment history
    - Display budget deduction history
    - Implement real-time updates via NgRx selectors
    - _Requirements: 1.1-1.7, 2.7_
  
  - [x] 14.2 Create BudgetAdjustmentDialogComponent
    - Create form for budget adjustment with amount and reason
    - Implement validation (min/max amounts, required reason)
    - Check user permissions before allowing adjustment
    - Display current budget and preview new budget
    - _Requirements: 2.1-2.8_
  
  - [ ]* 14.3 Write unit tests for budget components
    - Test budget display with different statuses
    - Test adjustment dialog validation
    - Test permission checking
    - Test real-time updates
    - _Requirements: 1.1-1.7, 2.1-2.8_

- [x] 15. Implement Timecard UI Components
  - [x] 15.1 Enhance TimecardEntryComponent
    - Display actual hours alongside rounded hours
    - Show rounding difference with explanation
    - Highlight rounded time used for budget calculations
    - Add visual indicator for 15-minute rounding
    - _Requirements: 3.1-3.7_
  
  - [ ]* 15.2 Write unit tests for timecard components
    - Test display of actual vs rounded hours
    - Test rounding difference calculation
    - Test integration with budget deduction
    - _Requirements: 3.1-3.7_

- [x] 16. Implement Travel UI Components
  - [x] 16.1 Create TechnicianTravelProfileComponent
    - Display travel flag with toggle control
    - Create form for home address entry with validation
    - Display geocoding status and errors
    - Show calculated coordinates when available
    - Implement permission-based editing
    - _Requirements: 4.1-4.7, 5.1-5.9_
  
  - [x] 16.2 Create TechnicianDistanceListComponent
    - Display technicians sorted by distance from job
    - Show distance in miles and driving time
    - Indicate per diem eligibility
    - Filter by travel willingness when required
    - Highlight recommended technicians
    - _Requirements: 9.1-9.6_
  
  - [ ]* 16.3 Write unit tests for travel components
    - Test travel flag toggle
    - Test address form validation
    - Test geocoding status display
    - Test distance list sorting and filtering
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_

- [x] 17. Implement Inventory UI Components
  - [x] 17.1 Create InventoryManagerComponent
    - Display inventory list with filtering controls
    - Show current location for each item
    - Display low stock alerts
    - Implement search and filter functionality
    - Show inventory value by location
    - _Requirements: 6.1-6.11_
  
  - [x] 17.2 Create InventoryAssignmentDialogComponent
    - Create form for assigning inventory to jobs/technicians/vendors
    - Check availability before assignment
    - Display location history
    - Add reason field for assignment
    - _Requirements: 6.5-6.8, 10.1-10.6_
  
  - [ ]* 17.3 Write unit tests for inventory components
    - Test inventory list display and filtering
    - Test low stock alert display
    - Test assignment dialog validation
    - Test availability checking
    - _Requirements: 6.1-6.11, 10.1-10.6_

- [x] 18. Implement Materials UI Components
  - [x] 18.1 Create MaterialsManagerComponent
    - Display materials list with current quantities
    - Show reorder recommendations with urgency indicators
    - Display supplier information
    - Implement material consumption interface
    - Show transaction history
    - _Requirements: 7.1-7.13_
  
  - [x] 18.2 Create PurchaseOrderDialogComponent
    - Create form for purchase order creation
    - Select materials and quantities
    - Select supplier
    - Calculate total cost
    - Display expected delivery date
    - _Requirements: 7.6-7.7, 7.13_
  
  - [ ]* 18.3 Write unit tests for materials components
    - Test materials list display
    - Test reorder recommendation display
    - Test purchase order form validation
    - Test material consumption flow
    - _Requirements: 7.1-7.13_

- [~] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Implement Reporting Components
  - [x] 20.1 Create JobCostReportComponent
    - Display comprehensive cost breakdown (labor, materials, travel)
    - Show budget vs actual comparison
    - Display variance analysis
    - Implement export to PDF and Excel
    - Show cost trends over time
    - _Requirements: 11.1-11.7, 12.8_
  
  - [x] 20.2 Create BudgetDashboardComponent
    - Display budget health across all active jobs
    - Show jobs at risk of going over budget
    - Display budget variance trends
    - Implement drill-down to job details
    - _Requirements: 12.1-12.2, 12.9_
  
  - [x] 20.3 Create ReportingService
    - Implement job cost report generation
    - Implement budget variance report generation
    - Implement travel cost report generation
    - Implement material usage report generation
    - Add data aggregation logic
    - _Requirements: 12.1-12.10_
  
  - [ ]* 20.4 Write unit tests for reporting components and service
    - Test cost breakdown calculations
    - Test variance calculations
    - Test report data aggregation
    - Test export functionality
    - _Requirements: 12.1-12.10_

- [x] 21. Implement API Integration Layer
  - [x] 21.1 Create budget API endpoints
    - Implement GET /api/budgets/job/:jobId
    - Implement POST /api/budgets
    - Implement POST /api/budgets/:jobId/adjustments
    - Implement GET /api/budgets/:jobId/adjustments
    - Implement POST /api/budgets/:jobId/deductions
    - Implement GET /api/budgets/:jobId/deductions
    - Add request/response validation
    - _Requirements: 1.1-1.7, 2.1-2.8_
  
  - [x] 21.2 Create travel API endpoints
    - Implement GET /api/travel/profiles/:technicianId
    - Implement PATCH /api/travel/profiles/:technicianId/flag
    - Implement PATCH /api/travel/profiles/:technicianId/address
    - Implement POST /api/travel/calculate-distances
    - Add geocoding integration
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_
  
  - [x] 21.3 Create inventory API endpoints
    - Implement GET /api/inventory with filtering
    - Implement POST /api/inventory
    - Implement GET /api/inventory/:itemId
    - Implement POST /api/inventory/:itemId/assign
    - Implement GET /api/inventory/:itemId/history
    - Implement GET /api/inventory/low-stock
    - _Requirements: 6.1-6.11, 10.1-10.6_
  
  - [x] 21.4 Create materials API endpoints
    - Implement GET /api/materials
    - Implement POST /api/materials
    - Implement POST /api/materials/:materialId/consume
    - Implement POST /api/materials/:materialId/receive
    - Implement GET /api/materials/:materialId/transactions
    - Implement GET /api/materials/reorder-recommendations
    - Implement POST /api/purchase-orders
    - Implement GET /api/purchase-orders/:poId
    - Implement PATCH /api/purchase-orders/:poId/status
    - _Requirements: 7.1-7.13, 11.1-11.7_
  
  - [x] 21.5 Create reporting API endpoints
    - Implement GET /api/reports/job-cost/:jobId
    - Implement GET /api/reports/budget-variance
    - Implement GET /api/reports/travel-costs
    - Implement GET /api/reports/material-usage
    - _Requirements: 12.1-12.10_
  
  - [ ]* 21.6 Write integration tests for all API endpoints
    - Test all CRUD operations
    - Test error responses
    - Test authorization checks
    - Test data validation
    - _Requirements: All API-related requirements_

- [x] 22. Implement Error Handling and Security
  - [x] 22.1 Implement comprehensive error handling
    - Add error interceptor for HTTP errors
    - Implement user-friendly error messages
    - Add error logging with context
    - Implement retry logic for transient failures
    - Add graceful degradation for external service failures
    - _Requirements: All requirements (error handling aspect)_
  
  - [x] 22.2 Implement authorization and security
    - Add role-based access control for budget adjustments
    - Implement field-level encryption for home addresses
    - Add audit logging for sensitive operations
    - Implement permission checks in all components
    - Add GDPR/CCPA compliance for PII handling
    - _Requirements: 2.1-2.2, 4.3-4.4, 5.8-5.9_
  
  - [ ]* 22.3 Write security tests
    - Test authorization for all protected operations
    - Test PII data protection
    - Test audit trail completeness
    - Test permission enforcement
    - _Requirements: 2.1-2.2, 4.3-4.4, 5.8-5.9_

- [x] 23. Implement Integration with Existing Systems
  - [x] 23.1 Integrate with job management system
    - Auto-create budget on job creation
    - Display budget in job detail view
    - Update job health indicators based on budget status
    - Generate final cost report on job completion
    - _Requirements: 1.1, 8.1-8.6, 12.8_
  
  - [x] 23.2 Integrate with timecard system
    - Trigger budget deduction on timecard submission
    - Pass rounded hours to budget system
    - Update budget status in real-time
    - Generate alerts at budget thresholds
    - _Requirements: 3.1-3.7, 8.1-8.6_
  
  - [x] 23.3 Integrate with technician management system
    - Add travel tab to technician profile
    - Add travel filter to technician list
    - Show distances in assignment interface
    - Calculate per diem for travel jobs
    - _Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6_
  
  - [x] 23.4 Integrate with reporting dashboard
    - Add job cost report to job detail view
    - Add budget variance report to manager dashboard
    - Add travel cost report to financial reporting
    - Add material usage report to inventory dashboard
    - _Requirements: 12.1-12.10_
  
  - [ ]* 23.5 Write end-to-end integration tests
    - Test complete job lifecycle with budget tracking
    - Test travel job assignment workflow
    - Test inventory management workflow
    - Test materials procurement and consumption workflow
    - _Requirements: All integration requirements_

- [x] 24. Implement Performance Optimizations
  - [x] 24.1 Add caching strategies
    - Cache geocoding results for 30 days
    - Cache distance calculations for 24 hours
    - Cache budget status calculations
    - Cache inventory availability checks
    - _Requirements: All requirements (performance aspect)_
  
  - [x] 24.2 Add database indexing
    - Add index on job_budgets.job_id
    - Add index on travel_profiles.technician_id
    - Add index on inventory_items location fields
    - Add index on material_transactions fields
    - _Requirements: All requirements (performance aspect)_
  
  - [x] 24.3 Implement batch operations
    - Batch distance calculations (up to 100 technicians)
    - Batch inventory queries by location
    - Batch material transaction queries
    - _Requirements: 9.2, 6.9, 7.10_
  
  - [ ]* 24.4 Write performance tests
    - Test budget calculation latency (< 100ms)
    - Test distance calculation for 100+ technicians (< 2s)
    - Test inventory queries (< 200ms)
    - Test materials queries (< 200ms)
    - _Requirements: All requirements (performance aspect)_

- [ ] 25. Final checkpoint and deployment preparation
  - [~] 25.1 Run full test suite
    - Verify all unit tests pass
    - Verify all property-based tests pass (100+ iterations)
    - Verify all integration tests pass
    - Verify all end-to-end tests pass
    - _Requirements: All requirements_
  
  - [~] 25.2 Create database migrations
    - Create migration scripts for all new tables
    - Add indexes for performance
    - Migrate existing job data to create initial budgets
    - _Requirements: All requirements (data persistence aspect)_
  
  - [~] 25.3 Configure environment settings
    - Set up Azure Maps API key
    - Configure budget alert thresholds
    - Configure per diem settings
    - Configure rounding settings
    - Configure inventory and materials settings
    - _Requirements: All requirements (configuration aspect)_
  
  - [~] 25.4 Set up monitoring and alerts
    - Monitor Azure Maps API usage
    - Monitor budget deduction latency
    - Monitor geocoding success rate
    - Monitor supplier integration failures
    - Set up alerts for authorization failures
    - _Requirements: All requirements (monitoring aspect)_
  
  - [~] 25.5 Final verification
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples, edge cases, and integration points
- All 28 correctness properties from the design document are covered
- Implementation uses TypeScript with Angular and NgRx
- Azure Maps API integration required for geocoding and distance calculations
- Comprehensive error handling and security implementation included
- Performance optimizations and monitoring included for production readiness
