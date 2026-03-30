-- =============================================================================
-- Field Resource Management (FRM) Database Schema
-- =============================================================================
-- PostgreSQL schema covering all FRM entities: users/roles, technicians, jobs,
-- crews, assignments, scheduling, timecards, payroll, onboarding, inventory,
-- materials, travel, budgets, reporting, notifications, and audit logging.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- For geolocation queries

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
  'Temp', 'User', 'Technician', 'DeploymentEngineer', 'PM', 'CM',
  'Manager', 'Admin', 'DCOps', 'VendorRep', 'SRITech', 'HR', 'Client',
  'OSPCoordinator', 'Controller', 'EngineeringFieldSupport',
  'MaterialsManager', 'Payroll'
);

CREATE TYPE technician_role AS ENUM (
  'Installer', 'Lead', 'Level1', 'Level2', 'Level3', 'Level4'
);

CREATE TYPE employment_type AS ENUM ('W2', '1099');

CREATE TYPE skill_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

CREATE TYPE certification_status AS ENUM ('Active', 'ExpiringSoon', 'Expired');

CREATE TYPE job_type AS ENUM ('Install', 'Decom', 'SiteSurvey', 'PM');

CREATE TYPE job_priority AS ENUM ('P1', 'P2', 'Normal');

CREATE TYPE job_status AS ENUM (
  'NotStarted', 'EnRoute', 'OnSite', 'Completed', 'Issue', 'Cancelled'
);

CREATE TYPE authorization_status AS ENUM ('authorized', 'pending');

CREATE TYPE invoicing_process AS ENUM (
  'weekly', 'bi-weekly', 'monthly', 'per-milestone', 'upon-completion'
);

CREATE TYPE assignment_status AS ENUM (
  'Assigned', 'Accepted', 'Rejected', 'InProgress', 'Completed'
);

CREATE TYPE conflict_severity AS ENUM ('Warning', 'Error');

CREATE TYPE crew_status AS ENUM ('AVAILABLE', 'ON_JOB', 'UNAVAILABLE');

CREATE TYPE timecard_status AS ENUM (
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'requires_correction'
);

CREATE TYPE expense_type AS ENUM (
  'mileage', 'meals', 'lodging', 'materials', 'tools', 'parking', 'other'
);

CREATE TYPE reimbursement_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

CREATE TYPE unlock_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE budget_status AS ENUM ('on-track', 'warning', 'over-budget');

CREATE TYPE rounding_method AS ENUM ('round-up', 'round-down', 'round-nearest');

CREATE TYPE offer_status AS ENUM ('pre_offer', 'offer', 'offer_acceptance');

CREATE TYPE vest_size AS ENUM ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL');

CREATE TYPE incident_type AS ENUM ('auto_accident', 'work_injury', 'other');

CREATE TYPE account_type AS ENUM ('checking', 'savings');

CREATE TYPE filing_status AS ENUM (
  'single_or_married_filing_separately',
  'married_filing_jointly',
  'head_of_household'
);

CREATE TYPE inventory_category AS ENUM (
  'tools', 'equipment', 'vehicles', 'safety-gear', 'test-equipment', 'other'
);

CREATE TYPE inventory_status AS ENUM (
  'available', 'assigned', 'in-use', 'maintenance', 'retired'
);

CREATE TYPE location_type AS ENUM ('job', 'technician', 'vendor', 'warehouse');

CREATE TYPE material_category AS ENUM (
  'cable', 'connectors', 'hardware', 'consumables', 'other'
);

CREATE TYPE material_transaction_type AS ENUM (
  'receipt', 'consumption', 'adjustment', 'return'
);

CREATE TYPE purchase_order_status AS ENUM (
  'draft', 'submitted', 'approved', 'ordered',
  'partially-received', 'received', 'cancelled'
);

CREATE TYPE reorder_urgency AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE geocoding_status AS ENUM (
  'not-geocoded', 'pending', 'success', 'failed'
);

CREATE TYPE notification_type AS ENUM (
  'job_assignment', 'job_status_change', 'certification_expiring',
  'conflict_detected', 'time_entry_reminder', 'system_alert'
);

CREATE TYPE audit_action_type AS ENUM (
  'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REASSIGN',
  'STATUS_CHANGE', 'CLOCK_IN', 'CLOCK_OUT', 'LOGIN', 'LOGOUT', 'CONFIG_CHANGE'
);


-- ---------------------------------------------------------------------------
-- 1. USERS & AUTHENTICATION
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  role          user_role NOT NULL DEFAULT 'User',
  market        VARCHAR(100),          -- Market/region scoping (e.g. 'DALLAS', 'HOUSTON', 'RG')
  company       VARCHAR(100),          -- Company scoping for PM/Vendor roles
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_market ON users (market);
CREATE INDEX idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- 2. SKILLS (lookup table)
-- ---------------------------------------------------------------------------

CREATE TABLE skills (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  category   VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_skills_name_category ON skills (name, category);

-- ---------------------------------------------------------------------------
-- 3. TECHNICIANS
-- ---------------------------------------------------------------------------

CREATE TABLE technicians (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id    VARCHAR(50) NOT NULL UNIQUE,  -- Business ID
  user_id          UUID REFERENCES users(id),
  first_name       VARCHAR(100) NOT NULL,
  last_name        VARCHAR(100) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(50),
  role             technician_role NOT NULL DEFAULT 'Installer',
  employment_type  employment_type NOT NULL DEFAULT 'W2',
  home_base        VARCHAR(100),
  region           VARCHAR(100),
  hourly_cost_rate NUMERIC(10,2),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  can_travel       BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat      DOUBLE PRECISION,
  current_lng      DOUBLE PRECISION,
  current_loc_accuracy DOUBLE PRECISION,
  current_loc_ts   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_technicians_region ON technicians (region);
CREATE INDEX idx_technicians_is_active ON technicians (is_active);
CREATE INDEX idx_technicians_role ON technicians (role);

-- ---------------------------------------------------------------------------
-- 3a. TECHNICIAN SKILLS (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE technician_skills (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id  UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  skill_id       UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level          skill_level NOT NULL DEFAULT 'BEGINNER',
  verified_date  DATE,
  UNIQUE (technician_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- 3b. CERTIFICATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE certifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id   UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  issue_date      DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status          certification_status NOT NULL DEFAULT 'Active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certifications_tech ON certifications (technician_id);
CREATE INDEX idx_certifications_expiry ON certifications (expiration_date);

-- ---------------------------------------------------------------------------
-- 3c. TECHNICIAN AVAILABILITY
-- ---------------------------------------------------------------------------

CREATE TABLE technician_availability (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  reason        VARCHAR(100),  -- PTO, Sick, Training
  UNIQUE (technician_id, date)
);

CREATE INDEX idx_availability_date ON technician_availability (date);

-- ---------------------------------------------------------------------------
-- 4. JOBS
-- ---------------------------------------------------------------------------

CREATE TABLE jobs (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                  VARCHAR(50) NOT NULL UNIQUE,  -- Business ID
  client                  VARCHAR(255) NOT NULL,
  site_name               VARCHAR(255) NOT NULL,
  -- Address
  site_street             VARCHAR(255),
  site_city               VARCHAR(100),
  site_state              VARCHAR(50),
  site_zip_code           VARCHAR(20),
  site_latitude           DOUBLE PRECISION,
  site_longitude          DOUBLE PRECISION,
  -- Job details
  job_type                job_type NOT NULL DEFAULT 'Install',
  priority                job_priority NOT NULL DEFAULT 'Normal',
  status                  job_status NOT NULL DEFAULT 'NotStarted',
  scope_description       TEXT,
  required_crew_size      INT NOT NULL DEFAULT 1,
  estimated_labor_hours   NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Scheduling
  scheduled_start_date    TIMESTAMPTZ NOT NULL,
  scheduled_end_date      TIMESTAMPTZ NOT NULL,
  actual_start_date       TIMESTAMPTZ,
  actual_end_date         TIMESTAMPTZ,
  -- Customer POC
  customer_poc_name       VARCHAR(255),
  customer_poc_phone      VARCHAR(50),
  customer_poc_email      VARCHAR(255),
  -- Pricing & Billing
  authorization_status    authorization_status DEFAULT 'pending',
  has_purchase_orders     BOOLEAN NOT NULL DEFAULT FALSE,
  purchase_order_number   VARCHAR(100),
  standard_bill_rate      NUMERIC(10,2),
  overtime_bill_rate      NUMERIC(10,2),
  per_diem                NUMERIC(10,2),
  invoicing_process       invoicing_process,
  -- SRI Internal
  project_director        VARCHAR(255),
  target_resources        INT,
  biz_dev_contact         VARCHAR(255),
  requested_hours         NUMERIC(10,2),
  overtime_required       BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_overtime_hours NUMERIC(10,2),
  -- Scoping
  market                  VARCHAR(100),
  company                 VARCHAR(100),
  -- Audit
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs (status);
CREATE INDEX idx_jobs_priority ON jobs (priority);
CREATE INDEX idx_jobs_market ON jobs (market);
CREATE INDEX idx_jobs_company ON jobs (company);
CREATE INDEX idx_jobs_scheduled_start ON jobs (scheduled_start_date);
CREATE INDEX idx_jobs_client ON jobs (client);

-- ---------------------------------------------------------------------------
-- 4a. JOB REQUIRED SKILLS (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE job_required_skills (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id   UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level    skill_level NOT NULL DEFAULT 'BEGINNER',
  UNIQUE (job_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- 4b. JOB ATTACHMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE job_attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name   VARCHAR(500) NOT NULL,
  file_size   BIGINT NOT NULL,
  file_type   VARCHAR(100) NOT NULL,
  blob_url    TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_attachments_job ON job_attachments (job_id);

-- ---------------------------------------------------------------------------
-- 4c. JOB NOTES
-- ---------------------------------------------------------------------------

CREATE TABLE job_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  author     UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_job_notes_job ON job_notes (job_id);


-- ---------------------------------------------------------------------------
-- 5. CREWS
-- ---------------------------------------------------------------------------

CREATE TABLE crews (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(255) NOT NULL,
  lead_technician_id  UUID REFERENCES technicians(id),
  market              VARCHAR(100),
  company             VARCHAR(100),
  status              crew_status NOT NULL DEFAULT 'AVAILABLE',
  active_job_id       UUID REFERENCES jobs(id),
  current_lat         DOUBLE PRECISION,
  current_lng         DOUBLE PRECISION,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crews_market ON crews (market);
CREATE INDEX idx_crews_status ON crews (status);

-- ---------------------------------------------------------------------------
-- 5a. CREW MEMBERS (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE crew_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id       UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (crew_id, technician_id)
);

-- ---------------------------------------------------------------------------
-- 6. ASSIGNMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE assignments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technician_id  UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  assigned_by    UUID REFERENCES users(id),
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         assignment_status NOT NULL DEFAULT 'Assigned',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  start_time     TIMESTAMPTZ,
  end_time       TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_job ON assignments (job_id);
CREATE INDEX idx_assignments_tech ON assignments (technician_id);
CREATE INDEX idx_assignments_status ON assignments (status);
CREATE INDEX idx_assignments_active ON assignments (is_active) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 6a. ASSIGNMENT CONFLICTS
-- ---------------------------------------------------------------------------

CREATE TABLE assignment_conflicts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id               UUID NOT NULL REFERENCES jobs(id),
  technician_id        UUID NOT NULL REFERENCES technicians(id),
  conflicting_job_id   UUID NOT NULL REFERENCES jobs(id),
  time_range_start     TIMESTAMPTZ NOT NULL,
  time_range_end       TIMESTAMPTZ NOT NULL,
  severity             conflict_severity NOT NULL DEFAULT 'Warning',
  resolved             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conflicts_tech ON assignment_conflicts (technician_id);

-- ---------------------------------------------------------------------------
-- 7. TIME ENTRIES
-- ---------------------------------------------------------------------------

CREATE TABLE time_entries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                UUID NOT NULL REFERENCES jobs(id),
  technician_id         UUID NOT NULL REFERENCES technicians(id),
  clock_in_time         TIMESTAMPTZ NOT NULL,
  clock_out_time        TIMESTAMPTZ,
  clock_in_lat          DOUBLE PRECISION,
  clock_in_lng          DOUBLE PRECISION,
  clock_in_accuracy     DOUBLE PRECISION,
  clock_out_lat         DOUBLE PRECISION,
  clock_out_lng         DOUBLE PRECISION,
  clock_out_accuracy    DOUBLE PRECISION,
  total_hours           NUMERIC(8,2),
  regular_hours         NUMERIC(8,2),
  overtime_hours        NUMERIC(8,2),
  mileage               NUMERIC(10,2),
  break_minutes         INT,
  is_manually_adjusted  BOOLEAN NOT NULL DEFAULT FALSE,
  adjusted_by           UUID REFERENCES users(id),
  adjustment_reason     TEXT,
  is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_job ON time_entries (job_id);
CREATE INDEX idx_time_entries_tech ON time_entries (technician_id);
CREATE INDEX idx_time_entries_clock_in ON time_entries (clock_in_time);

-- ---------------------------------------------------------------------------
-- 8. TIMECARD PERIODS
-- ---------------------------------------------------------------------------

CREATE TABLE timecard_periods (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id    UUID NOT NULL REFERENCES technicians(id),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  period_type      VARCHAR(20) NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('weekly', 'biweekly')),
  status           timecard_status NOT NULL DEFAULT 'draft',
  total_hours      NUMERIC(8,2) NOT NULL DEFAULT 0,
  regular_hours    NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_hours   NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_expenses   NUMERIC(12,2) NOT NULL DEFAULT 0,
  submitted_at     TIMESTAMPTZ,
  submitted_by     UUID REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES users(id),
  rejection_reason TEXT,
  notes            TEXT,
  is_locked        BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timecard_periods_tech ON timecard_periods (technician_id);
CREATE INDEX idx_timecard_periods_status ON timecard_periods (status);
CREATE INDEX idx_timecard_periods_dates ON timecard_periods (start_date, end_date);

-- ---------------------------------------------------------------------------
-- 8a. TIMECARD LOCK CONFIG (singleton-ish, one row per company/market)
-- ---------------------------------------------------------------------------

CREATE TABLE timecard_lock_config (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabled                 BOOLEAN NOT NULL DEFAULT TRUE,
  lock_day                VARCHAR(10) NOT NULL DEFAULT 'Friday',
  lock_time               VARCHAR(5) NOT NULL DEFAULT '17:00',
  grace_period_hours      INT NOT NULL DEFAULT 2,
  allow_manager_unlock    BOOLEAN NOT NULL DEFAULT TRUE,
  require_unlock_reason   BOOLEAN NOT NULL DEFAULT TRUE,
  auto_relock_after_hours INT NOT NULL DEFAULT 24,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8b. UNLOCK REQUESTS
-- ---------------------------------------------------------------------------

CREATE TABLE unlock_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id        UUID NOT NULL REFERENCES timecard_periods(id),
  requested_by     UUID NOT NULL REFERENCES users(id),
  reason           TEXT NOT NULL,
  status           unlock_request_status NOT NULL DEFAULT 'pending',
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 9. EXPENSES
-- ---------------------------------------------------------------------------

CREATE TABLE expenses (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_entry_id          UUID REFERENCES time_entries(id),
  job_id                 UUID NOT NULL REFERENCES jobs(id),
  technician_id          UUID NOT NULL REFERENCES technicians(id),
  type                   expense_type NOT NULL,
  amount                 NUMERIC(12,2) NOT NULL,
  currency               VARCHAR(3) NOT NULL DEFAULT 'USD',
  date                   DATE NOT NULL,
  description            TEXT,
  category               VARCHAR(100),
  receipt_url            TEXT,
  receipt_thumbnail_url  TEXT,
  is_reimbursable        BOOLEAN NOT NULL DEFAULT TRUE,
  reimbursement_status   reimbursement_status NOT NULL DEFAULT 'pending',
  approved_by            UUID REFERENCES users(id),
  approved_at            TIMESTAMPTZ,
  paid_at                TIMESTAMPTZ,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_job ON expenses (job_id);
CREATE INDEX idx_expenses_tech ON expenses (technician_id);
CREATE INDEX idx_expenses_status ON expenses (reimbursement_status);

-- ---------------------------------------------------------------------------
-- 10. ENHANCED TIMECARD ENTRIES (rounding support)
-- ---------------------------------------------------------------------------

CREATE TABLE timecard_entries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id       UUID NOT NULL REFERENCES technicians(id),
  job_id              UUID NOT NULL REFERENCES jobs(id),
  clock_in            TIMESTAMPTZ NOT NULL,
  clock_out           TIMESTAMPTZ NOT NULL,
  actual_hours        NUMERIC(8,4) NOT NULL,
  rounded_hours       NUMERIC(8,2) NOT NULL,
  rounding_difference NUMERIC(8,4) NOT NULL DEFAULT 0,
  status              timecard_status NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 10a. ROUNDING CONFIG
-- ---------------------------------------------------------------------------

CREATE TABLE rounding_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interval_minutes  INT NOT NULL DEFAULT 15,
  rounding_method   rounding_method NOT NULL DEFAULT 'round-up',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 11. JOB BUDGETS
-- ---------------------------------------------------------------------------

CREATE TABLE job_budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
  allocated_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  consumed_hours  NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining_hours NUMERIC(10,2) GENERATED ALWAYS AS (allocated_hours - consumed_hours) STORED,
  status          budget_status NOT NULL DEFAULT 'on-track',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 11a. BUDGET ADJUSTMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE budget_adjustments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id           UUID NOT NULL REFERENCES jobs(id),
  amount           NUMERIC(10,2) NOT NULL,  -- Positive = increase, negative = decrease
  reason           TEXT NOT NULL,
  adjusted_by      UUID NOT NULL REFERENCES users(id),
  adjusted_by_name VARCHAR(255) NOT NULL,
  previous_budget  NUMERIC(10,2) NOT NULL,
  new_budget       NUMERIC(10,2) NOT NULL,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_adj_job ON budget_adjustments (job_id);

-- ---------------------------------------------------------------------------
-- 11b. BUDGET DEDUCTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE budget_deductions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id             UUID NOT NULL REFERENCES jobs(id),
  timecard_entry_id  UUID NOT NULL REFERENCES timecard_entries(id),
  technician_id      UUID NOT NULL REFERENCES technicians(id),
  technician_name    VARCHAR(255) NOT NULL,
  hours_deducted     NUMERIC(8,2) NOT NULL,
  timestamp          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_ded_job ON budget_deductions (job_id);

-- ---------------------------------------------------------------------------
-- 12. ONBOARDING CANDIDATES
-- ---------------------------------------------------------------------------

CREATE TABLE candidates (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id            VARCHAR(50) NOT NULL UNIQUE,  -- Business ID
  tech_name               VARCHAR(255) NOT NULL,
  tech_email              VARCHAR(255) NOT NULL,
  tech_phone              VARCHAR(50),
  vest_size               vest_size NOT NULL DEFAULT 'L',
  drug_test_complete      BOOLEAN NOT NULL DEFAULT FALSE,
  osha_certified          BOOLEAN NOT NULL DEFAULT FALSE,
  scissor_lift_certified  BOOLEAN NOT NULL DEFAULT FALSE,
  biisci_certified        BOOLEAN NOT NULL DEFAULT FALSE,
  work_site               VARCHAR(255),
  start_date              DATE,
  offer_status            offer_status NOT NULL DEFAULT 'pre_offer',
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by              UUID REFERENCES users(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_status ON candidates (offer_status);
CREATE INDEX idx_candidates_work_site ON candidates (work_site);

-- ---------------------------------------------------------------------------
-- 13. PAYROLL — INCIDENT REPORTS
-- ---------------------------------------------------------------------------

CREATE TABLE incident_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          incident_type NOT NULL,
  employee_id   UUID NOT NULL REFERENCES technicians(id),
  incident_date DATE NOT NULL,
  description   TEXT NOT NULL,
  reported_by   UUID NOT NULL REFERENCES users(id),
  reported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_employee ON incident_reports (employee_id);
CREATE INDEX idx_incidents_date ON incident_reports (incident_date);

-- ---------------------------------------------------------------------------
-- 13a. DIRECT DEPOSIT CHANGES
-- ---------------------------------------------------------------------------

CREATE TABLE direct_deposit_changes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES technicians(id),
  bank_name           VARCHAR(255) NOT NULL,
  account_type        account_type NOT NULL,
  bank_account_last4  VARCHAR(4) NOT NULL,
  routing_number_last4 VARCHAR(4) NOT NULL,
  submitted_by        UUID NOT NULL REFERENCES users(id),
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dd_employee ON direct_deposit_changes (employee_id);

-- ---------------------------------------------------------------------------
-- 13b. W-4 CHANGES
-- ---------------------------------------------------------------------------

CREATE TABLE w4_changes (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id                     UUID NOT NULL REFERENCES technicians(id),
  filing_status                   filing_status NOT NULL,
  multiple_jobs_or_spouse_works   BOOLEAN NOT NULL DEFAULT FALSE,
  claim_dependents                NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_income                    NUMERIC(10,2) NOT NULL DEFAULT 0,
  deductions                      NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_withholding               NUMERIC(10,2) NOT NULL DEFAULT 0,
  submitted_by                    UUID NOT NULL REFERENCES users(id),
  submitted_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_w4_employee ON w4_changes (employee_id);

-- ---------------------------------------------------------------------------
-- 13c. CONTACT INFO CHANGES
-- ---------------------------------------------------------------------------

CREATE TABLE contact_info_changes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id    UUID NOT NULL REFERENCES technicians(id),
  address        TEXT,
  phone          VARCHAR(50),
  email          VARCHAR(255),
  fields_changed TEXT[] NOT NULL DEFAULT '{}',
  updated_by     UUID NOT NULL REFERENCES users(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_employee ON contact_info_changes (employee_id);

-- ---------------------------------------------------------------------------
-- 13d. PRC SIGNATURES
-- ---------------------------------------------------------------------------

CREATE TABLE prc_signatures (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES technicians(id),
  signed_by    UUID NOT NULL REFERENCES users(id),
  signed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  document_ref VARCHAR(255) NOT NULL
);

CREATE INDEX idx_prc_employee ON prc_signatures (employee_id);

-- ---------------------------------------------------------------------------
-- 13e. PAY STUBS
-- ---------------------------------------------------------------------------

CREATE TABLE pay_stubs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id      UUID NOT NULL REFERENCES technicians(id),
  pay_period_start DATE NOT NULL,
  pay_period_end   DATE NOT NULL,
  gross_pay        NUMERIC(12,2) NOT NULL,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay          NUMERIC(12,2) NOT NULL,
  payment_date     DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pay_stub_deductions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pay_stub_id UUID NOT NULL REFERENCES pay_stubs(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  amount      NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_pay_stubs_employee ON pay_stubs (employee_id);
CREATE INDEX idx_pay_stubs_period ON pay_stubs (pay_period_start, pay_period_end);

-- ---------------------------------------------------------------------------
-- 13f. W-2 DOCUMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE w2_documents (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id                     UUID NOT NULL REFERENCES technicians(id),
  tax_year                        INT NOT NULL,
  employer_name                   VARCHAR(255) NOT NULL,
  employee_name                   VARCHAR(255) NOT NULL,
  wages_tips                      NUMERIC(12,2) NOT NULL,
  federal_income_tax_withheld     NUMERIC(12,2) NOT NULL,
  social_security_wages           NUMERIC(12,2) NOT NULL,
  social_security_tax_withheld    NUMERIC(12,2) NOT NULL,
  medicare_wages                  NUMERIC(12,2) NOT NULL,
  medicare_tax_withheld           NUMERIC(12,2) NOT NULL,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_w2_employee_year ON w2_documents (employee_id, tax_year);


-- ---------------------------------------------------------------------------
-- 14. INVENTORY
-- ---------------------------------------------------------------------------

CREATE TABLE inventory_items (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_number          VARCHAR(100) NOT NULL UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  category             inventory_category NOT NULL,
  -- Current location
  location_type        location_type NOT NULL DEFAULT 'warehouse',
  location_id          UUID,           -- FK depends on type (job, technician, vendor, warehouse)
  location_name        VARCHAR(255),
  location_assigned_at TIMESTAMPTZ,
  quantity             INT NOT NULL DEFAULT 0,
  unit_cost            NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_value          NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  minimum_threshold    INT NOT NULL DEFAULT 0,
  serial_number        VARCHAR(255),
  manufacturer         VARCHAR(255),
  model                VARCHAR(255),
  purchase_date        DATE,
  warranty_expiration  DATE,
  status               inventory_status NOT NULL DEFAULT 'available',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_category ON inventory_items (category);
CREATE INDEX idx_inventory_status ON inventory_items (status);
CREATE INDEX idx_inventory_location ON inventory_items (location_type, location_id);

-- ---------------------------------------------------------------------------
-- 14a. INVENTORY LOCATION HISTORY
-- ---------------------------------------------------------------------------

CREATE TABLE inventory_location_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  from_location_type location_type,
  from_location_id   UUID,
  from_location_name VARCHAR(255),
  to_location_type   location_type NOT NULL,
  to_location_id     UUID NOT NULL,
  to_location_name   VARCHAR(255) NOT NULL,
  moved_by           UUID NOT NULL REFERENCES users(id),
  moved_by_name      VARCHAR(255) NOT NULL,
  reason             TEXT,
  timestamp          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_history_item ON inventory_location_history (inventory_item_id);

-- ---------------------------------------------------------------------------
-- 15. SUPPLIERS
-- ---------------------------------------------------------------------------

CREATE TABLE suppliers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(255) NOT NULL,
  contact_name         VARCHAR(255),
  email                VARCHAR(255),
  phone                VARCHAR(50),
  address_street       VARCHAR(255),
  address_city         VARCHAR(100),
  address_state        VARCHAR(50),
  address_postal_code  VARCHAR(20),
  automation_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  api_endpoint         TEXT,
  api_key              TEXT,           -- Encrypted at rest
  lead_time_days       INT NOT NULL DEFAULT 7,
  minimum_order_amount NUMERIC(12,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 16. MATERIALS
-- ---------------------------------------------------------------------------

CREATE TABLE materials (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_number       VARCHAR(100) NOT NULL UNIQUE,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  category              material_category NOT NULL,
  unit                  VARCHAR(20) NOT NULL,  -- 'ft', 'ea', 'box'
  current_quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_point         NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost             NUMERIC(12,2) NOT NULL DEFAULT 0,
  preferred_supplier_id UUID REFERENCES suppliers(id),
  last_order_date       TIMESTAMPTZ,
  last_received_date    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_category ON materials (category);
CREATE INDEX idx_materials_supplier ON materials (preferred_supplier_id);

-- ---------------------------------------------------------------------------
-- 16a. MATERIAL ALTERNATE SUPPLIERS (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE material_alternate_suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  UNIQUE (material_id, supplier_id)
);

-- ---------------------------------------------------------------------------
-- 16b. MATERIAL TRANSACTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE material_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id       UUID NOT NULL REFERENCES materials(id),
  transaction_type  material_transaction_type NOT NULL,
  quantity          NUMERIC(12,2) NOT NULL,
  unit_cost         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
  job_id            UUID REFERENCES jobs(id),
  supplier_id       UUID REFERENCES suppliers(id),
  purchase_order_id UUID,  -- FK added after purchase_orders table
  performed_by      UUID NOT NULL REFERENCES users(id),
  performed_by_name VARCHAR(255) NOT NULL,
  notes             TEXT,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mat_txn_material ON material_transactions (material_id);
CREATE INDEX idx_mat_txn_job ON material_transactions (job_id);

-- ---------------------------------------------------------------------------
-- 16c. PURCHASE ORDERS
-- ---------------------------------------------------------------------------

CREATE TABLE purchase_orders (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number              VARCHAR(100) NOT NULL UNIQUE,
  supplier_id            UUID NOT NULL REFERENCES suppliers(id),
  supplier_name          VARCHAR(255) NOT NULL,
  total_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status                 purchase_order_status NOT NULL DEFAULT 'draft',
  order_date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date   TIMESTAMPTZ,
  created_by             UUID NOT NULL REFERENCES users(id),
  created_by_name        VARCHAR(255) NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_po_supplier ON purchase_orders (supplier_id);
CREATE INDEX idx_po_status ON purchase_orders (status);

-- Add FK for material_transactions
ALTER TABLE material_transactions
  ADD CONSTRAINT fk_mat_txn_po
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);

-- ---------------------------------------------------------------------------
-- 16d. PURCHASE ORDER ITEMS
-- ---------------------------------------------------------------------------

CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id       UUID NOT NULL REFERENCES materials(id),
  material_name     VARCHAR(255) NOT NULL,
  quantity          NUMERIC(12,2) NOT NULL,
  unit_cost         NUMERIC(12,2) NOT NULL,
  total_cost        NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_po_items_po ON purchase_order_items (purchase_order_id);

-- ---------------------------------------------------------------------------
-- 17. TRAVEL PROFILES
-- ---------------------------------------------------------------------------

CREATE TABLE travel_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id     UUID NOT NULL REFERENCES technicians(id) UNIQUE,
  willing_to_travel BOOLEAN NOT NULL DEFAULT FALSE,
  home_street       VARCHAR(255),
  home_city         VARCHAR(100),
  home_state        VARCHAR(50),
  home_postal_code  VARCHAR(20),
  home_lat          DOUBLE PRECISION,
  home_lng          DOUBLE PRECISION,
  geocoding_status  geocoding_status NOT NULL DEFAULT 'not-geocoded',
  geocoding_error   TEXT,
  last_geocoded_at  TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 17a. PER DIEM CONFIG
-- ---------------------------------------------------------------------------

CREATE TABLE per_diem_config (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  minimum_distance_miles NUMERIC(8,2) NOT NULL DEFAULT 50,
  rate_per_mile          NUMERIC(6,3) NOT NULL DEFAULT 0.655,
  flat_rate_amount       NUMERIC(10,2),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 18. NOTIFICATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id),
  type                notification_type NOT NULL,
  message             TEXT NOT NULL,
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  link                TEXT,
  metadata            JSONB,
  related_entity_type VARCHAR(50),  -- 'job', 'technician', 'assignment', 'timeEntry'
  related_entity_id   UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications (created_at);

-- ---------------------------------------------------------------------------
-- 18a. NOTIFICATION PREFERENCES
-- ---------------------------------------------------------------------------

CREATE TABLE notification_preferences (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                         UUID NOT NULL REFERENCES users(id) UNIQUE,
  email_enabled                   BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled                  BOOLEAN NOT NULL DEFAULT TRUE,
  job_assignment_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  job_status_change_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  certification_expiring_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  conflict_detected_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 19. AUDIT LOG
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID REFERENCES users(id),
  user_name   VARCHAR(255),
  action_type audit_action_type NOT NULL,
  entity      VARCHAR(100) NOT NULL,  -- Table/entity name
  entity_id   UUID,
  details     JSONB,
  ip_address  INET,
  user_agent  TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log (timestamp);
CREATE INDEX idx_audit_user ON audit_log (user_id);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id);
CREATE INDEX idx_audit_action ON audit_log (action_type);

-- ---------------------------------------------------------------------------
-- 20. UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply auto-update trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
