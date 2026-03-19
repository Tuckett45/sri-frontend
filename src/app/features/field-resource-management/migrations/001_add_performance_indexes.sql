-- ============================================================================
-- Migration: 001_add_performance_indexes.sql
-- Description: Add database indexes for performance optimization across
--              budget, travel, inventory, and materials subsystems.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Budget System Indexes
-- ---------------------------------------------------------------------------

-- Index for looking up budgets by job ID (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_job_budgets_job_id
  ON job_budgets (job_id);

-- Index for querying budget adjustment history by job
CREATE INDEX IF NOT EXISTS idx_budget_adjustments_job_id
  ON budget_adjustments (job_id);

-- Index for querying budget deduction history by job
CREATE INDEX IF NOT EXISTS idx_budget_deductions_job_id
  ON budget_deductions (job_id);

-- ---------------------------------------------------------------------------
-- Travel System Indexes
-- ---------------------------------------------------------------------------

-- Index for looking up travel profiles by technician ID
CREATE INDEX IF NOT EXISTS idx_travel_profiles_technician_id
  ON travel_profiles (technician_id);

-- Index for filtering technicians by travel willingness
CREATE INDEX IF NOT EXISTS idx_travel_profiles_willing_to_travel
  ON travel_profiles (willing_to_travel);

-- ---------------------------------------------------------------------------
-- Inventory System Indexes
-- ---------------------------------------------------------------------------

-- Composite index for location-based inventory queries (type + id)
CREATE INDEX IF NOT EXISTS idx_inventory_items_location
  ON inventory_items (current_location_type, current_location_id);

-- Index for filtering inventory by category
CREATE INDEX IF NOT EXISTS idx_inventory_items_category
  ON inventory_items (category);

-- Index for filtering inventory by status
CREATE INDEX IF NOT EXISTS idx_inventory_items_status
  ON inventory_items (status);

-- Index for looking up location history by inventory item
CREATE INDEX IF NOT EXISTS idx_inventory_location_history_item_id
  ON inventory_location_history (inventory_item_id);

-- ---------------------------------------------------------------------------
-- Materials System Indexes
-- ---------------------------------------------------------------------------

-- Index for querying transaction history by material
CREATE INDEX IF NOT EXISTS idx_material_transactions_material_id
  ON material_transactions (material_id);

-- Index for querying material costs per job
CREATE INDEX IF NOT EXISTS idx_material_transactions_job_id
  ON material_transactions (job_id);

-- Index for filtering transactions by type (receipt, consumption, etc.)
CREATE INDEX IF NOT EXISTS idx_material_transactions_type
  ON material_transactions (transaction_type);

-- Index for querying materials by preferred supplier
CREATE INDEX IF NOT EXISTS idx_materials_preferred_supplier_id
  ON materials (preferred_supplier_id);

-- ---------------------------------------------------------------------------
-- Purchase Order Indexes
-- ---------------------------------------------------------------------------

-- Index for querying orders by supplier
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
  ON purchase_orders (supplier_id);

-- Index for filtering orders by status
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON purchase_orders (status);
