# Timecard Enhancements Specification

## Overview
Enhance the existing timecard functionality with enterprise-grade features including weekly/biweekly views, time entry locking, expense tracking, approval workflows, and comprehensive reporting.

## Current State
The timecard dashboard currently provides:
- Daily time entry tracking with clock in/out
- Weekly summary view
- Geolocation capture for clock in/out
- Mileage tracking
- Basic time calculations

## Proposed Enhancements

### 1. Multi-Period Views
**Priority**: High

#### 1.1 Weekly View (Enhanced)
- Full week grid view (Monday-Sunday)
- Daily breakdown with totals
- Visual indicators for incomplete days
- Quick edit capabilities
- Overtime highlighting (>40 hours)

#### 1.2 Biweekly View
- Two-week period display
- Pay period alignment (configurable start day)
- Period-to-date totals
- Comparison with previous period
- Projected totals based on current week

#### 1.3 Monthly View
- Calendar-style month view
- Daily hour totals
- Monthly summary statistics
- Export capabilities

### 2. Time Entry Locking System
**Priority**: High

#### 2.1 Automatic Locking Rules
- Lock time entries after Friday 5 PM for the completed week
- Configurable lock time (default: Friday 5 PM local time)
- Grace period option (e.g., lock Saturday 12 AM)
- Admin override capability

#### 2.2 Lock Status Indicators
- Visual lock icon on locked entries
- Lock status badge on timecard
- Countdown timer showing time until lock
- Notification before lock occurs

#### 2.3 Unlock Workflow
- Request unlock with reason
- Manager/Admin approval required
- Audit trail for all unlock requests
- Time-limited unlock window

#### 2.4 Lock Configuration
```typescript
interface TimecardLockConfig {
  enabled: boolean;
  lockDay: 'Friday' | 'Saturday' | 'Sunday';
  lockTime: string; // HH:mm format
  gracePeriodHours: number;
  allowManagerUnlock: boolean;
  requireUnlockReason: boolean;
  autoRelockAfterHours: number;
}
```

### 3. Expense Tracking Integration
**Priority**: High

#### 3.1 Expense Types
- Mileage (already tracked)
- Meals
- Lodging
- Materials/Supplies
- Tools/Equipment
- Parking/Tolls
- Other (with description)

#### 3.2 Expense Entry
- Add expenses to specific time entries
- Attach receipts (photos/PDFs)
- Categorize expenses
- Add notes/descriptions
- Link to specific jobs

#### 3.3 Expense Model
```typescript
interface Expense {
  id: string;
  timeEntryId: string;
  jobId: string;
  technicianId: string;
  type: ExpenseType;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  category: string;
  receiptUrl?: string;
  receiptThumbnailUrl?: string;
  isReimbursable: boolean;
  reimbursementStatus: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

enum ExpenseType {
  Mileage = 'mileage',
  Meals = 'meals',
  Lodging = 'lodging',
  Materials = 'materials',
  Tools = 'tools',
  Parking = 'parking',
  Other = 'other'
}
```

#### 3.4 Expense Summary
- Daily expense totals
- Weekly expense breakdown by category
- Reimbursement status tracking
- Export expense reports

### 4. Approval Workflow
**Priority**: Medium

#### 4.1 Submission Process
- Submit timecard for approval (weekly/biweekly)
- Validation checks before submission
- Confirmation dialog with summary
- Email notification to approver

#### 4.2 Approval States
```typescript
enum TimecardStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  UnderReview = 'under_review',
  Approved = 'approved',
  Rejected = 'rejected',
  RequiresCorrection = 'requires_correction'
}

interface TimecardPeriod {
  id: string;
  technicianId: string;
  startDate: Date;
  endDate: Date;
  status: TimecardStatus;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  totalExpenses: number;
  timeEntries: TimeEntry[];
  expenses: Expense[];
  submittedAt?: Date;
  submittedBy?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4.3 Manager Review Interface
- Queue of pending timecards
- Side-by-side comparison view
- Bulk approval capability
- Request corrections with comments
- Approve with modifications

### 5. Enhanced Time Entry Features
**Priority**: Medium

#### 5.1 Break Time Tracking
- Automatic break deduction (configurable)
- Manual break entry
- Paid vs unpaid breaks
- Break compliance warnings

#### 5.2 Overtime Calculation
- Automatic overtime detection (>40 hours/week)
- Daily overtime rules (>8 hours/day)
- Double-time calculation
- Overtime approval workflow

#### 5.3 Time Entry Validation
- Overlapping time entry detection
- Maximum hours per day warning
- Missing clock out alerts
- Geofencing validation (optional)

#### 5.4 Bulk Operations
- Copy previous week
- Apply template
- Bulk edit multiple entries
- Mass delete/adjust

### 6. Reporting & Analytics
**Priority**: Medium

#### 6.1 Technician Reports
- Weekly/biweekly summary
- Expense report
- Mileage log
- Job time breakdown
- Export to PDF/Excel

#### 6.2 Manager Reports
- Team timecard summary
- Approval status dashboard
- Overtime analysis
- Expense tracking by technician
- Labor cost analysis

#### 6.3 Admin Reports
- Company-wide time tracking
- Compliance reports
- Audit trail
- Cost center allocation
- Payroll export

### 7. Mobile Enhancements
**Priority**: Medium

#### 7.1 Quick Actions
- One-tap clock in/out
- Voice-activated time entry
- Offline time entry with sync
- Push notifications for reminders

#### 7.2 Receipt Capture
- Camera integration for receipts
- OCR for expense amount extraction
- Batch upload capability
- Receipt organization

### 8. Integration Features
**Priority**: Low

#### 8.1 Payroll Integration
- Export to common payroll formats (ADP, Paychex, QuickBooks)
- Automated payroll sync
- Pay period alignment
- Wage calculation support

#### 8.2 Accounting Integration
- Export to accounting systems
- Cost center allocation
- Project/job costing
- GL code mapping

## Implementation Phases

### Phase 1: Core Enhancements (Weeks 1-2)
- Weekly/biweekly view implementation
- Time entry locking system
- Basic expense tracking
- Enhanced validation

### Phase 2: Approval Workflow (Weeks 3-4)
- Submission process
- Manager review interface
- Status tracking
- Notifications

### Phase 3: Advanced Features (Weeks 5-6)
- Break time tracking
- Overtime calculations
- Bulk operations
- Enhanced reporting

### Phase 4: Integration & Polish (Weeks 7-8)
- Payroll export
- Mobile enhancements
- Performance optimization
- User testing & refinement

## Technical Considerations

### State Management
```typescript
// New state slices needed
interface TimecardState {
  periods: TimecardPeriod[];
  expenses: Expense[];
  lockConfig: TimecardLockConfig;
  approvalQueue: TimecardPeriod[];
  selectedPeriod: TimecardPeriod | null;
  loading: boolean;
  error: string | null;
}
```

### API Endpoints
```
POST   /api/timecards/periods                    - Create timecard period
GET    /api/timecards/periods/:id                - Get period details
PUT    /api/timecards/periods/:id                - Update period
POST   /api/timecards/periods/:id/submit         - Submit for approval
POST   /api/timecards/periods/:id/approve        - Approve period
POST   /api/timecards/periods/:id/reject         - Reject period
POST   /api/timecards/periods/:id/unlock         - Request unlock

POST   /api/timecards/expenses                   - Create expense
GET    /api/timecards/expenses/:id               - Get expense
PUT    /api/timecards/expenses/:id               - Update expense
DELETE /api/timecards/expenses/:id               - Delete expense
POST   /api/timecards/expenses/:id/receipt       - Upload receipt

GET    /api/timecards/lock-config                - Get lock configuration
PUT    /api/timecards/lock-config                - Update lock configuration

GET    /api/timecards/reports/summary            - Get summary report
GET    /api/timecards/reports/expenses           - Get expense report
GET    /api/timecards/reports/payroll            - Export payroll data
```

### Database Schema Updates
```sql
-- Timecard periods table
CREATE TABLE timecard_periods (
  id UUID PRIMARY KEY,
  technician_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  total_hours DECIMAL(10,2),
  regular_hours DECIMAL(10,2),
  overtime_hours DECIMAL(10,2),
  total_expenses DECIMAL(10,2),
  submitted_at TIMESTAMP,
  submitted_by UUID,
  reviewed_at TIMESTAMP,
  reviewed_by UUID,
  approved_at TIMESTAMP,
  approved_by UUID,
  rejection_reason TEXT,
  notes TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  time_entry_id UUID,
  job_id UUID NOT NULL,
  technician_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  date DATE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  receipt_url TEXT,
  receipt_thumbnail_url TEXT,
  is_reimbursable BOOLEAN DEFAULT TRUE,
  reimbursement_status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Timecard lock configuration
CREATE TABLE timecard_lock_config (
  id UUID PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  lock_day VARCHAR(20) DEFAULT 'Friday',
  lock_time TIME DEFAULT '17:00:00',
  grace_period_hours INT DEFAULT 0,
  allow_manager_unlock BOOLEAN DEFAULT TRUE,
  require_unlock_reason BOOLEAN DEFAULT TRUE,
  auto_relock_after_hours INT DEFAULT 24,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unlock requests audit
CREATE TABLE unlock_requests (
  id UUID PRIMARY KEY,
  period_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## UI/UX Mockups

### Weekly View Layout
```
┌─────────────────────────────────────────────────────────────┐
│ My Timecard - Week of Dec 9-15, 2024          [Submit] [⚙️] │
├─────────────────────────────────────────────────────────────┤
│ Status: Draft | Total: 42.5h | Regular: 40h | OT: 2.5h     │
│ Expenses: $245.50 | 🔒 Locks in 2 days 14 hours            │
├─────────────────────────────────────────────────────────────┤
│        Mon    Tue    Wed    Thu    Fri    Sat    Sun        │
│ Hours  8.0h   8.5h   8.0h   9.0h   9.0h   0.0h   0.0h       │
│ Jobs   2      2      3      2      2      -      -          │
│ Exp    $45    $52    $38    $60    $50    -      -          │
├─────────────────────────────────────────────────────────────┤
│ [+ Add Time Entry] [+ Add Expense] [Copy Last Week]         │
└─────────────────────────────────────────────────────────────┘
```

### Expense Entry Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Add Expense                                            [✕]   │
├─────────────────────────────────────────────────────────────┤
│ Type: [Meals ▼]                                             │
│ Amount: [$_____.__]                                         │
│ Date: [12/10/2024]                                          │
│ Job: [JOB-12345 - Client Name ▼]                           │
│ Description: [_________________________________]            │
│ Receipt: [📷 Take Photo] [📁 Upload File]                  │
│ ☑ Reimbursable                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel] [Save Expense]        │
└─────────────────────────────────────────────────────────────┘
```

## Success Metrics
- Timecard submission rate: >95%
- Approval turnaround time: <24 hours
- Expense tracking adoption: >80%
- Time entry accuracy: >98%
- User satisfaction: >4.5/5

## Risks & Mitigation
1. **Risk**: Complex approval workflows slow down payroll
   - **Mitigation**: Implement bulk approval, auto-approval rules

2. **Risk**: Lock system prevents legitimate corrections
   - **Mitigation**: Quick unlock process, manager override

3. **Risk**: Expense tracking adds too much overhead
   - **Mitigation**: OCR for receipts, mobile-first design

4. **Risk**: Performance issues with large datasets
   - **Mitigation**: Pagination, lazy loading, data archiving

## Dependencies
- Backend API updates for new endpoints
- Database schema migrations
- File storage for receipt uploads
- Email notification service
- PDF generation library for reports

## Future Enhancements
- AI-powered time entry suggestions
- Predictive overtime alerts
- Automated expense categorization
- Integration with GPS tracking
- Voice-activated time entry
- Biometric clock in/out
- Blockchain-based audit trail
