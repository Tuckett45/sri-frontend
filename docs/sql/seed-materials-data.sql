-- ============================================================================
-- MATERIALS SEED DATA  (SQL Server / T-SQL)
-- ----------------------------------------------------------------------------
-- Populates the Materials feature tables with realistic sample data.
-- Schema source: backend migrations 010 (core) + 011 (stock/ledger/assets/counts).
--
-- Safe to re-run: every INSERT is guarded with IF NOT EXISTS on its primary key
-- (or natural key), so running this script multiple times will not duplicate rows.
--
-- FK order honored:  Materials -> (Orders, Assignments, Stock, Transfers, Assets)
--                    MaterialCounts -> MaterialCountLines
-- MaterialTransactions is an append-only ledger (no FK) and is guarded by
-- ReferenceType + ReferenceId so it is only inserted once.
--
-- Balances are internally consistent: MaterialStock.QuantityOnHand and each
-- ledger QuantityAfter reconcile with the signed QuantityDelta values below.
-- ============================================================================

SET NOCOUNT ON;
GO

-- ============================================================================
-- 1. MATERIALS  (parent rows — insert first)
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.Materials WHERE Id = 'MAT-0001')
    INSERT INTO dbo.Materials (Id, Sku, Name, Category, Description, Unit, Site, Market, QuantityOnHand, ReorderLevel, UnitCost, IsSerialized, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('MAT-0001', 'CBL-SM-144', 'Single-Mode Fiber Cable 144ct', 'Cable', '144-count single-mode OSP fiber, per foot', 'ft', 'Dallas WH', 'DALLAS', 12500.00, 3000.00, 0.85, 0, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.Materials WHERE Id = 'MAT-0002')
    INSERT INTO dbo.Materials (Id, Sku, Name, Category, Description, Unit, Site, Market, QuantityOnHand, ReorderLevel, UnitCost, IsSerialized, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('MAT-0002', 'CON-SC-APC', 'SC/APC Connector', 'Connectors', 'SC/APC field-installable connector', 'ea', 'Dallas WH', 'DALLAS', 4200.00, 1000.00, 3.25, 0, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.Materials WHERE Id = 'MAT-0003')
    INSERT INTO dbo.Materials (Id, Sku, Name, Category, Description, Unit, Site, Market, QuantityOnHand, ReorderLevel, UnitCost, IsSerialized, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('MAT-0003', 'HW-ANCH-38', 'Anchor Bolt 3/8in', 'Hardware', 'Galvanized anchor bolt, 3/8 inch', 'ea', 'Plano WH', 'DALLAS', 850.00, 250.00, 1.10, 0, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.Materials WHERE Id = 'MAT-0004')
    INSERT INTO dbo.Materials (Id, Sku, Name, Category, Description, Unit, Site, Market, QuantityOnHand, ReorderLevel, UnitCost, IsSerialized, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('MAT-0004', 'CNS-CLEAN-1', 'Fiber Cleaning Wipes', 'Consumables', 'Lint-free fiber optic cleaning wipes, box of 50', 'box', 'Plano WH', 'DALLAS', 180.00, 60.00, 12.50, 0, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

-- Serialized item (drives MaterialAssets below)
IF NOT EXISTS (SELECT 1 FROM dbo.Materials WHERE Id = 'MAT-0005')
    INSERT INTO dbo.Materials (Id, Sku, Name, Category, Description, Unit, Site, Market, QuantityOnHand, ReorderLevel, UnitCost, IsSerialized, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('MAT-0005', 'TST-OTDR-1', 'OTDR Test Unit', 'Other', 'Handheld OTDR test unit (serialized asset)', 'ea', 'Dallas WH', 'DALLAS', 6.00, 2.00, 4800.00, 1, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

PRINT 'Materials inserted.';
GO

-- ============================================================================
-- 2. MATERIALSTOCK  (per-material, per-site balances)
--    UNIQUE(MaterialId, Site) — guard on that natural key.
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialStock WHERE MaterialId = 'MAT-0001' AND Site = 'Dallas WH')
    INSERT INTO dbo.MaterialStock (Id, MaterialId, Site, Market, QuantityOnHand, ReorderLevel, UpdatedBy, UpdatedDate, CreatedDate)
    VALUES ('STK-0001', 'MAT-0001', 'Dallas WH', 'DALLAS', 12500.00, 3000.00, 'seed', SYSUTCDATETIME(), SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialStock WHERE MaterialId = 'MAT-0002' AND Site = 'Dallas WH')
    INSERT INTO dbo.MaterialStock (Id, MaterialId, Site, Market, QuantityOnHand, ReorderLevel, UpdatedBy, UpdatedDate, CreatedDate)
    VALUES ('STK-0002', 'MAT-0002', 'Dallas WH', 'DALLAS', 4200.00, 1000.00, 'seed', SYSUTCDATETIME(), SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialStock WHERE MaterialId = 'MAT-0003' AND Site = 'Plano WH')
    INSERT INTO dbo.MaterialStock (Id, MaterialId, Site, Market, QuantityOnHand, ReorderLevel, UpdatedBy, UpdatedDate, CreatedDate)
    VALUES ('STK-0003', 'MAT-0003', 'Plano WH', 'DALLAS', 850.00, 250.00, 'seed', SYSUTCDATETIME(), SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialStock WHERE MaterialId = 'MAT-0004' AND Site = 'Plano WH')
    INSERT INTO dbo.MaterialStock (Id, MaterialId, Site, Market, QuantityOnHand, ReorderLevel, UpdatedBy, UpdatedDate, CreatedDate)
    VALUES ('STK-0004', 'MAT-0004', 'Plano WH', 'DALLAS', 180.00, 60.00, 'seed', SYSUTCDATETIME(), SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialStock WHERE MaterialId = 'MAT-0005' AND Site = 'Dallas WH')
    INSERT INTO dbo.MaterialStock (Id, MaterialId, Site, Market, QuantityOnHand, ReorderLevel, UpdatedBy, UpdatedDate, CreatedDate)
    VALUES ('STK-0005', 'MAT-0005', 'Dallas WH', 'DALLAS', 6.00, 2.00, 'seed', SYSUTCDATETIME(), SYSUTCDATETIME());

PRINT 'MaterialStock inserted.';
GO

-- ============================================================================
-- 3. MATERIALORDERS  (intake / export)
--    Direction: Intake|Export   Status: Pending|Ordered|Received|Shipped|Cancelled
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialOrders WHERE Id = 'ORD-0001')
    INSERT INTO dbo.MaterialOrders (Id, MaterialId, OrderNumber, Direction, Status, Quantity, Vendor, Site, Market, UnitCost, Notes, OrderedDate, FulfilledDate, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('ORD-0001', 'MAT-0001', 'PO-2026-1001', 'Intake', 'Received', 5000.00, 'Corning Optical', 'Dallas WH', 'DALLAS', 0.83, 'Restock of 144ct SM fiber', DATEADD(DAY, -20, SYSUTCDATETIME()), DATEADD(DAY, -12, SYSUTCDATETIME()), 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialOrders WHERE Id = 'ORD-0002')
    INSERT INTO dbo.MaterialOrders (Id, MaterialId, OrderNumber, Direction, Status, Quantity, Vendor, Site, Market, UnitCost, Notes, OrderedDate, FulfilledDate, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('ORD-0002', 'MAT-0002', 'PO-2026-1002', 'Intake', 'Ordered', 2000.00, 'CommScope', 'Dallas WH', 'DALLAS', 3.10, 'SC/APC connectors bulk order', DATEADD(DAY, -5, SYSUTCDATETIME()), NULL, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialOrders WHERE Id = 'ORD-0003')
    INSERT INTO dbo.MaterialOrders (Id, MaterialId, OrderNumber, Direction, Status, Quantity, Vendor, Site, Market, UnitCost, Notes, OrderedDate, FulfilledDate, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('ORD-0003', 'MAT-0004', 'PO-2026-1003', 'Intake', 'Pending', 100.00, 'Fiber Instrument Sales', 'Plano WH', 'DALLAS', 12.00, 'Cleaning wipes reorder', DATEADD(DAY, -2, SYSUTCDATETIME()), NULL, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialOrders WHERE Id = 'ORD-0004')
    INSERT INTO dbo.MaterialOrders (Id, MaterialId, OrderNumber, Direction, Status, Quantity, Vendor, Site, Market, UnitCost, Notes, OrderedDate, FulfilledDate, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('ORD-0004', 'MAT-0003', 'SO-2026-2001', 'Export', 'Shipped', 150.00, 'Verizon Site 42', 'Plano WH', 'DALLAS', 1.10, 'Anchor bolts shipped to field site', DATEADD(DAY, -8, SYSUTCDATETIME()), DATEADD(DAY, -6, SYSUTCDATETIME()), 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

PRINT 'MaterialOrders inserted.';
GO

-- ============================================================================
-- 4. MATERIALASSIGNMENTS  (issued to technicians)
--    Status: Issued|PartiallyReturned|Returned
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialAssignments WHERE Id = 'ASG-0001')
    INSERT INTO dbo.MaterialAssignments (Id, MaterialId, TechnicianId, TechnicianName, QuantityIssued, QuantityReturned, Status, Site, Market, Notes, IssuedDate, ReturnedDate, IssuedBy)
    VALUES ('ASG-0001', 'MAT-0002', 'TECH-101', 'Marcus Rivera', 200.00, 0.00, 'Issued', 'Dallas WH', 'DALLAS', 'Connectors for install job J-5001', DATEADD(DAY, -3, SYSUTCDATETIME()), NULL, 'seed');

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialAssignments WHERE Id = 'ASG-0002')
    INSERT INTO dbo.MaterialAssignments (Id, MaterialId, TechnicianId, TechnicianName, QuantityIssued, QuantityReturned, Status, Site, Market, Notes, IssuedDate, ReturnedDate, IssuedBy)
    VALUES ('ASG-0002', 'MAT-0004', 'TECH-102', 'Priya Patel', 10.00, 4.00, 'PartiallyReturned', 'Plano WH', 'DALLAS', '6 boxes consumed, 4 returned', DATEADD(DAY, -7, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'seed');

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialAssignments WHERE Id = 'ASG-0003')
    INSERT INTO dbo.MaterialAssignments (Id, MaterialId, TechnicianId, TechnicianName, QuantityIssued, QuantityReturned, Status, Site, Market, Notes, IssuedDate, ReturnedDate, IssuedBy)
    VALUES ('ASG-0003', 'MAT-0003', 'TECH-103', 'James OConnor', 50.00, 50.00, 'Returned', 'Plano WH', 'DALLAS', 'All anchor bolts returned - job cancelled', DATEADD(DAY, -10, SYSUTCDATETIME()), DATEADD(DAY, -9, SYSUTCDATETIME()), 'seed');

PRINT 'MaterialAssignments inserted.';
GO

-- ============================================================================
-- 5. MATERIALTRANSFERS  (site-to-site)
--    Status: Pending|Completed|Cancelled
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransfers WHERE Id = 'TRF-0001')
    INSERT INTO dbo.MaterialTransfers (Id, MaterialId, FromSite, ToSite, Market, Quantity, Status, Notes, CompletedDate, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('TRF-0001', 'MAT-0001', 'Dallas WH', 'Plano WH', 'DALLAS', 1000.00, 'Completed', 'Balance stock between warehouses', DATEADD(DAY, -4, SYSUTCDATETIME()), 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransfers WHERE Id = 'TRF-0002')
    INSERT INTO dbo.MaterialTransfers (Id, MaterialId, FromSite, ToSite, Market, Quantity, Status, Notes, CompletedDate, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('TRF-0002', 'MAT-0002', 'Dallas WH', 'Plano WH', 'DALLAS', 500.00, 'Pending', 'Connector transfer awaiting truck', NULL, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

PRINT 'MaterialTransfers inserted.';
GO

-- ============================================================================
-- 6. MATERIALASSETS  (serialized units of MAT-0005)
--    Status: InStock|Issued|Retired|Lost   UNIQUE(MaterialId, SerialNumber)
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialAssets WHERE MaterialId = 'MAT-0005' AND SerialNumber = 'OTDR-SN-0001')
    INSERT INTO dbo.MaterialAssets (Id, MaterialId, SerialNumber, LotNumber, Status, Site, Market, AssignedTechnicianId, AssignedTechnicianName, Notes, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('AST-0001', 'MAT-0005', 'OTDR-SN-0001', 'LOT-2025-A', 'InStock', 'Dallas WH', 'DALLAS', NULL, NULL, NULL, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialAssets WHERE MaterialId = 'MAT-0005' AND SerialNumber = 'OTDR-SN-0002')
    INSERT INTO dbo.MaterialAssets (Id, MaterialId, SerialNumber, LotNumber, Status, Site, Market, AssignedTechnicianId, AssignedTechnicianName, Notes, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('AST-0002', 'MAT-0005', 'OTDR-SN-0002', 'LOT-2025-A', 'Issued', 'Dallas WH', 'DALLAS', 'TECH-101', 'Marcus Rivera', 'Assigned to lead tech', 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialAssets WHERE MaterialId = 'MAT-0005' AND SerialNumber = 'OTDR-SN-0003')
    INSERT INTO dbo.MaterialAssets (Id, MaterialId, SerialNumber, LotNumber, Status, Site, Market, AssignedTechnicianId, AssignedTechnicianName, Notes, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('AST-0003', 'MAT-0005', 'OTDR-SN-0003', 'LOT-2025-B', 'Retired', 'Dallas WH', 'DALLAS', NULL, NULL, 'Out of calibration, retired', 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

PRINT 'MaterialAssets inserted.';
GO

-- ============================================================================
-- 7. MATERIALCOUNTS + MATERIALCOUNTLINES  (physical inventory counts)
--    Counts.Status: Open|Posted|Cancelled
--    CountLines UNIQUE(CountId, MaterialId); CountedQuantity/Variance NULLable
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialCounts WHERE Id = 'CNT-0001')
    INSERT INTO dbo.MaterialCounts (Id, Site, Market, Status, Notes, PostedDate, PostedBy, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('CNT-0001', 'Dallas WH', 'DALLAS', 'Posted', 'Q1 cycle count - Dallas', DATEADD(DAY, -15, SYSUTCDATETIME()), 'seed', 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialCounts WHERE Id = 'CNT-0002')
    INSERT INTO dbo.MaterialCounts (Id, Site, Market, Status, Notes, PostedDate, PostedBy, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate)
    VALUES ('CNT-0002', 'Plano WH', 'DALLAS', 'Open', 'Q1 cycle count - Plano (in progress)', NULL, NULL, 'seed', SYSUTCDATETIME(), 'seed', SYSUTCDATETIME());

-- Posted count lines (counted + variance filled in)
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialCountLines WHERE CountId = 'CNT-0001' AND MaterialId = 'MAT-0001')
    INSERT INTO dbo.MaterialCountLines (Id, CountId, MaterialId, SystemQuantity, CountedQuantity, Variance, Notes)
    VALUES ('CL-0001', 'CNT-0001', 'MAT-0001', 12500.00, 12480.00, -20.00, 'Minor shrinkage on reel');

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialCountLines WHERE CountId = 'CNT-0001' AND MaterialId = 'MAT-0002')
    INSERT INTO dbo.MaterialCountLines (Id, CountId, MaterialId, SystemQuantity, CountedQuantity, Variance, Notes)
    VALUES ('CL-0002', 'CNT-0001', 'MAT-0002', 4200.00, 4200.00, 0.00, 'Exact match');

-- Open count lines (not yet counted — CountedQuantity/Variance NULL)
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialCountLines WHERE CountId = 'CNT-0002' AND MaterialId = 'MAT-0003')
    INSERT INTO dbo.MaterialCountLines (Id, CountId, MaterialId, SystemQuantity, CountedQuantity, Variance, Notes)
    VALUES ('CL-0003', 'CNT-0002', 'MAT-0003', 850.00, NULL, NULL, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialCountLines WHERE CountId = 'CNT-0002' AND MaterialId = 'MAT-0004')
    INSERT INTO dbo.MaterialCountLines (Id, CountId, MaterialId, SystemQuantity, CountedQuantity, Variance, Notes)
    VALUES ('CL-0004', 'CNT-0002', 'MAT-0004', 180.00, NULL, NULL, NULL);

PRINT 'MaterialCounts and MaterialCountLines inserted.';
GO

-- ============================================================================
-- 8. MATERIALTRANSACTIONS  (append-only ledger — no FK, Id is BIGINT IDENTITY)
--    TxnType: Intake|Export|Issue|Return|Transfer|Adjustment|Count
--    QuantityDelta is signed; QuantityAfter is the running balance.
--    Guarded on ReferenceType + ReferenceId so re-runs do not duplicate.
-- ============================================================================

-- MAT-0001: intake +5000 (from ORD-0001), then transfer -1000 (from TRF-0001), then count adj -20
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransactions WHERE ReferenceType = 'Order' AND ReferenceId = 'ORD-0001')
    INSERT INTO dbo.MaterialTransactions (MaterialId, Site, Market, TxnType, QuantityDelta, QuantityAfter, ReferenceType, ReferenceId, Reason, PerformedBy, PerformedAt)
    VALUES ('MAT-0001', 'Dallas WH', 'DALLAS', 'Intake', 5000.00, 13520.00, 'Order', 'ORD-0001', 'PO receipt', 'seed', DATEADD(DAY, -12, SYSUTCDATETIME()));

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransactions WHERE ReferenceType = 'Transfer' AND ReferenceId = 'TRF-0001')
    INSERT INTO dbo.MaterialTransactions (MaterialId, Site, Market, TxnType, QuantityDelta, QuantityAfter, ReferenceType, ReferenceId, Reason, PerformedBy, PerformedAt)
    VALUES ('MAT-0001', 'Dallas WH', 'DALLAS', 'Transfer', -1000.00, 12520.00, 'Transfer', 'TRF-0001', 'Transfer out to Plano WH', 'seed', DATEADD(DAY, -4, SYSUTCDATETIME()));

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransactions WHERE ReferenceType = 'Count' AND ReferenceId = 'CL-0001')
    INSERT INTO dbo.MaterialTransactions (MaterialId, Site, Market, TxnType, QuantityDelta, QuantityAfter, ReferenceType, ReferenceId, Reason, PerformedBy, PerformedAt)
    VALUES ('MAT-0001', 'Dallas WH', 'DALLAS', 'Count', -20.00, 12500.00, 'Count', 'CL-0001', 'Cycle count variance', 'seed', DATEADD(DAY, -15, SYSUTCDATETIME()));

-- MAT-0002: issue -200 to TECH-101 (from ASG-0001)
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransactions WHERE ReferenceType = 'Assignment' AND ReferenceId = 'ASG-0001')
    INSERT INTO dbo.MaterialTransactions (MaterialId, Site, Market, TxnType, QuantityDelta, QuantityAfter, ReferenceType, ReferenceId, Reason, PerformedBy, PerformedAt)
    VALUES ('MAT-0002', 'Dallas WH', 'DALLAS', 'Issue', -200.00, 4200.00, 'Assignment', 'ASG-0001', 'Issued to technician', 'seed', DATEADD(DAY, -3, SYSUTCDATETIME()));

-- MAT-0004: issue -10, return +4 (from ASG-0002)
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransactions WHERE ReferenceType = 'Assignment' AND ReferenceId = 'ASG-0002-ISSUE')
    INSERT INTO dbo.MaterialTransactions (MaterialId, Site, Market, TxnType, QuantityDelta, QuantityAfter, ReferenceType, ReferenceId, Reason, PerformedBy, PerformedAt)
    VALUES ('MAT-0004', 'Plano WH', 'DALLAS', 'Issue', -10.00, 176.00, 'Assignment', 'ASG-0002-ISSUE', 'Issued to technician', 'seed', DATEADD(DAY, -7, SYSUTCDATETIME()));

IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransactions WHERE ReferenceType = 'Assignment' AND ReferenceId = 'ASG-0002-RETURN')
    INSERT INTO dbo.MaterialTransactions (MaterialId, Site, Market, TxnType, QuantityDelta, QuantityAfter, ReferenceType, ReferenceId, Reason, PerformedBy, PerformedAt)
    VALUES ('MAT-0004', 'Plano WH', 'DALLAS', 'Return', 4.00, 180.00, 'Assignment', 'ASG-0002-RETURN', 'Partial return from technician', 'seed', DATEADD(DAY, -1, SYSUTCDATETIME()));

-- MAT-0003: export shipment -150 (from ORD-0004), then issue -50 & return +50 (ASG-0003)
IF NOT EXISTS (SELECT 1 FROM dbo.MaterialTransactions WHERE ReferenceType = 'Order' AND ReferenceId = 'ORD-0004')
    INSERT INTO dbo.MaterialTransactions (MaterialId, Site, Market, TxnType, QuantityDelta, QuantityAfter, ReferenceType, ReferenceId, Reason, PerformedBy, PerformedAt)
    VALUES ('MAT-0003', 'Plano WH', 'DALLAS', 'Export', -150.00, 850.00, 'Order', 'ORD-0004', 'Shipped to field site', 'seed', DATEADD(DAY, -6, SYSUTCDATETIME()));

PRINT 'MaterialTransactions inserted.';
GO

PRINT '============================================================================';
PRINT 'MATERIALS SEED DATA COMPLETE';
PRINT '============================================================================';
GO
