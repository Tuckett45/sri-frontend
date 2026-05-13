-- ============================================================================
-- ONBOARDING SEED DATA
-- Run this against your local database to populate test data
-- ============================================================================

-- NOTE: Replace these technician IDs with actual IDs from your Technicians table
-- You can find them with: SELECT Id, FirstName, LastName FROM Technicians

DECLARE @Tech1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Technicians ORDER BY FirstName);
DECLARE @Tech2 UNIQUEIDENTIFIER = (SELECT Id FROM Technicians ORDER BY FirstName OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY);
DECLARE @Tech3 UNIQUEIDENTIFIER = (SELECT Id FROM Technicians ORDER BY FirstName OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY);

-- If no technicians exist, create some
IF @Tech1 IS NULL
BEGIN
    SET @Tech1 = NEWID();
    SET @Tech2 = NEWID();
    SET @Tech3 = NEWID();

    INSERT INTO Technicians (Id, FirstName, LastName, Email, Phone, Role, Region, IsAvailable, IsActive, WillingToTravel, ScissorLiftCertified, CreatedAt, UpdatedAt)
    VALUES
        (@Tech1, 'Marcus', 'Rivera', 'marcus.rivera@fieldops.com', '214-555-2001', 'Lead', 'Dallas', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()),
        (@Tech2, 'Priya', 'Patel', 'priya.patel@fieldops.com', '214-555-2002', 'Installer', 'Plano', 1, 1, 1, 0, GETUTCDATE(), GETUTCDATE()),
        (@Tech3, 'James', 'OConnor', 'james.oconnor@fieldops.com', '972-555-2003', 'Level2', 'Irving', 0, 1, 0, 1, GETUTCDATE(), GETUTCDATE());
END

PRINT 'Using Technician IDs:';
PRINT CAST(@Tech1 AS NVARCHAR(50));
PRINT CAST(@Tech2 AS NVARCHAR(50));
PRINT CAST(@Tech3 AS NVARCHAR(50));


-- ============================================================================
-- CREDENTIALS
-- ============================================================================

INSERT INTO TechnicianCredentials (Id, TechnicianId, CredentialType, Name, Status, IssueDate, ExpirationDate, LicenseNumber, IssuingState, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'Drivers_License', 'Texas Drivers License', 'Active', '2025-01-15', '2027-01-15', 'DL-98234571', 'TX', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'Drivers_License', 'Texas Drivers License', 'ExpiringSoon', '2023-06-01', DATEADD(DAY, 25, GETUTCDATE()), 'DL-44521098', 'TX', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech3, 'Drivers_License', 'Texas Drivers License', 'Expired', '2022-03-10', DATEADD(DAY, -30, GETUTCDATE()), 'DL-67890234', 'TX', GETUTCDATE(), GETUTCDATE());

INSERT INTO TechnicianCredentials (Id, TechnicianId, CredentialType, Name, Status, TestDate, TestResult, TestingFacility, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'Drug_Screen', 'Pre-Employment Drug Screen', 'Active', '2025-11-01', 'pass', 'LabCorp Dallas', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'Drug_Screen', 'Annual Drug Screen', 'Active', '2026-02-15', 'pass', 'Quest Diagnostics Plano', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech3, 'Drug_Screen', 'Pre-Employment Drug Screen', 'Active', '2025-08-20', 'pass', 'LabCorp Irving', GETUTCDATE(), GETUTCDATE());

INSERT INTO TechnicianCredentials (Id, TechnicianId, CredentialType, Name, Status, IssueDate, ExpirationDate, CertificationNumber, TrainingProvider, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'OSHA_Training_Cert', 'OSHA 30-Hour Construction', 'Active', '2025-01-10', '2027-01-10', 'OSHA-30-2025-78432', 'National Safety Council', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'OSHA_Training_Cert', 'OSHA 10-Hour General Industry', 'Active', '2025-06-01', '2027-06-01', 'OSHA-10-2025-55210', 'Safety Training Institute', GETUTCDATE(), GETUTCDATE());

INSERT INTO TechnicianCredentials (Id, TechnicianId, CredentialType, Name, Status, SubmissionDate, CompletionDate, BackgroundResult, Provider, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'Background_Check', 'Pre-Employment Background Check', 'Active', '2024-12-01', '2024-12-10', 'pass', 'Sterling Check', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'Background_Check', 'Pre-Employment Background Check', 'Active', '2025-01-15', '2025-01-25', 'pass', 'HireRight', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech3, 'Background_Check', 'Annual Background Check', 'Active', '2025-09-01', '2025-09-10', 'pass', 'Sterling Check', GETUTCDATE(), GETUTCDATE());

INSERT INTO TechnicianCredentials (Id, TechnicianId, CredentialType, Name, Status, OfferDate, AcceptedDate, OfferStatus, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'Offer_Letter', 'Employment Offer Letter', 'Active', '2024-11-15', '2024-11-18', 'accepted', GETUTCDATE(), GETUTCDATE());

INSERT INTO TechnicianCredentials (Id, TechnicianId, CredentialType, Name, Status, LastFourDigits, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'SSN_Last_Four', 'SSN Verification', 'Active', '4521', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'SSN_Last_Four', 'SSN Verification', 'Active', '7891', GETUTCDATE(), GETUTCDATE());

PRINT 'Credentials inserted.';


-- ============================================================================
-- EQUIPMENT ASSIGNMENTS
-- ============================================================================

INSERT INTO EquipmentAssignments (Id, TechnicianId, AssetType, AssetIdentifier, AssignmentDate, ReturnDate, Status, Notes, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'badge', 'BADGE-1001', '2025-01-20', NULL, 'assigned', 'Main building access badge', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech1, 'laptop', 'LAPTOP-DL-4521', '2025-01-20', NULL, 'assigned', 'Dell Latitude 5540', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'badge', 'BADGE-1002', '2025-02-01', NULL, 'assigned', NULL, GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'laptop', 'LAPTOP-DL-3892', '2025-02-01', '2026-03-15', 'returned', 'Returned for upgrade', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech3, 'badge', 'BADGE-1003', '2025-03-10', NULL, 'lost', 'Reported lost on job site', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech3, 'laptop', 'LAPTOP-HP-7744', '2025-03-10', NULL, 'assigned', 'HP EliteBook 840', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech3, 'other', 'TOOL-KIT-055', '2025-03-15', NULL, 'assigned', 'Fiber optic tool kit', GETUTCDATE(), GETUTCDATE());

PRINT 'Equipment assignments inserted.';

-- ============================================================================
-- TECHNICAL COMPETENCIES
-- ============================================================================

INSERT INTO TechnicalCompetencies (Id, TechnicianId, CompetencyName, VerificationDate, VerifiedBy, ProficiencyLevel, Notes, CreatedAt, UpdatedAt)
VALUES
    (NEWID(), @Tech1, 'OTDR Knowledge', '2026-02-15', 'John Smith', 'expert', 'Demonstrated mastery in all OTDR testing scenarios', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech1, 'Fiber Optic Characterization / OTDR Testing', '2026-03-10', 'Jane Doe', 'advanced', 'Strong performance in fiber characterization', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'OTDR Knowledge', '2026-01-20', 'John Smith', 'intermediate', 'Solid understanding of basic OTDR operations', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech2, 'Fiber Optic Characterization / OTDR Testing', '2026-02-05', 'Jane Doe', 'beginner', 'Needs additional training', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @Tech3, 'OTDR Knowledge', '2025-10-01', 'Mike Johnson', 'advanced', NULL, GETUTCDATE(), GETUTCDATE());

PRINT 'Technical competencies inserted.';

-- ============================================================================
-- PERFORMANCE REVIEW CYCLES (PRC)
-- ============================================================================

DECLARE @PRC1 UNIQUEIDENTIFIER = NEWID();
DECLARE @PRC2 UNIQUEIDENTIFIER = NEWID();
DECLARE @PRC3 UNIQUEIDENTIFIER = NEWID();

INSERT INTO PerformanceReviewCycles (Id, TechnicianId, DueDate, CompletionDate, Status, CreatedAt, UpdatedAt)
VALUES
    (@PRC1, @Tech1, DATEADD(DAY, 25, GETUTCDATE()), NULL, 'upcoming', GETUTCDATE(), GETUTCDATE()),
    (@PRC2, @Tech2, DATEADD(DAY, -10, GETUTCDATE()), NULL, 'overdue', GETUTCDATE(), GETUTCDATE()),
    (@PRC3, @Tech3, DATEADD(DAY, -20, GETUTCDATE()), DATEADD(DAY, -22, GETUTCDATE()), 'completed', GETUTCDATE(), GETUTCDATE());

PRINT 'PRCs inserted.';

-- ============================================================================
-- PRC GOALS
-- ============================================================================

INSERT INTO PRCGoals (Id, PrcId, Description, TargetDate, Status, CompletionNotes, CreatedAt, UpdatedAt)
VALUES
    -- Tech1 PRC goals
    (NEWID(), @PRC1, 'Complete advanced OTDR certification training', DATEADD(DAY, 20, GETUTCDATE()), 'in_progress', NULL, GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @PRC1, 'Mentor two junior technicians on fiber splicing', DATEADD(DAY, 22, GETUTCDATE()), 'not_started', NULL, GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @PRC1, 'Achieve zero rework rate on installations', DATEADD(DAY, 15, GETUTCDATE()), 'completed', 'Maintained zero rework for 30 consecutive days', GETUTCDATE(), GETUTCDATE()),
    -- Tech2 PRC goals (overdue)
    (NEWID(), @PRC2, 'Improve scissor lift operation proficiency', DATEADD(DAY, -15, GETUTCDATE()), 'in_progress', NULL, GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @PRC2, 'Complete safety refresher course', DATEADD(DAY, -5, GETUTCDATE()), 'not_started', NULL, GETUTCDATE(), GETUTCDATE()),
    -- Tech3 PRC goals (completed)
    (NEWID(), @PRC3, 'Renew OSHA 30-Hour certification', DATEADD(DAY, -25, GETUTCDATE()), 'completed', 'Certification renewed successfully', GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @PRC3, 'Reduce average job completion time by 10%', DATEADD(DAY, -30, GETUTCDATE()), 'completed', 'Achieved 12% reduction', GETUTCDATE(), GETUTCDATE());

PRINT 'PRC Goals inserted.';

-- ============================================================================
-- CANDIDATES
-- ============================================================================

INSERT INTO Candidates (CandidateId, TechName, TechEmail, TechPhone, VestSize, DrugTestComplete, OshaCertified, ScissorLiftCertified, WorkSite, StartDate, OfferStatus, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
VALUES
    (NEWID(), 'Marcus Rivera', 'marcus.rivera@fieldops.com', '214-555-2001', 'L', 1, 1, 1, 'Dallas HQ', DATEADD(DAY, 5, GETUTCDATE()), 'offer_acceptance', 'admin', GETUTCDATE(), 'admin', GETUTCDATE()),
    (NEWID(), 'Priya Patel', 'priya.patel@fieldops.com', '214-555-2002', 'S', 1, 1, 0, 'Plano Tech Center', DATEADD(DAY, 10, GETUTCDATE()), 'offer', 'admin', GETUTCDATE(), 'admin', GETUTCDATE()),
    (NEWID(), 'James OConnor', 'james.oconnor@fieldops.com', '972-555-2003', 'XL', 0, 1, 1, 'Irving Business Park', DATEADD(DAY, 3, GETUTCDATE()), 'offer_acceptance', 'admin', GETUTCDATE(), 'admin', GETUTCDATE()),
    (NEWID(), 'Aisha Johnson', 'aisha.johnson@fieldops.com', '469-555-2004', 'M', 1, 0, 0, 'Fort Worth DC', DATEADD(DAY, 18, GETUTCDATE()), 'pre_offer', 'admin', GETUTCDATE(), 'admin', GETUTCDATE()),
    (NEWID(), 'Carlos Mendez', 'carlos.mendez@fieldops.com', '214-555-2005', 'L', 1, 1, 1, 'McKinney Site A', DATEADD(DAY, 7, GETUTCDATE()), 'offer', 'admin', GETUTCDATE(), 'admin', GETUTCDATE()),
    (NEWID(), 'Sarah Kim', 'sarah.kim@fieldops.com', '972-555-2006', 'S', 0, 1, 1, 'Richardson Data Center', DATEADD(DAY, 12, GETUTCDATE()), 'pre_offer', 'admin', GETUTCDATE(), 'admin', GETUTCDATE());

PRINT 'Candidates inserted.';

-- ============================================================================
-- ROLE CREDENTIAL TEMPLATES
-- ============================================================================

INSERT INTO RoleCredentialTemplates (Id, Role, Category, Name, CredentialType, AssetType, CompetencyName)
VALUES
    -- Installer
    (NEWID(), 'Installer', 'credential', 'Drivers License', 'Drivers_License', NULL, NULL),
    (NEWID(), 'Installer', 'credential', 'Drug Screen', 'Drug_Screen', NULL, NULL),
    (NEWID(), 'Installer', 'credential', 'OSHA Training Cert', 'OSHA_Training_Cert', NULL, NULL),
    (NEWID(), 'Installer', 'credential', 'Background Check', 'Background_Check', NULL, NULL),
    (NEWID(), 'Installer', 'equipment', 'Badge', NULL, 'badge', NULL),
    (NEWID(), 'Installer', 'equipment', 'Laptop', NULL, 'laptop', NULL),
    (NEWID(), 'Installer', 'competency', 'OTDR Knowledge', NULL, NULL, 'OTDR Knowledge'),
    (NEWID(), 'Installer', 'prc', 'Initial PRC', NULL, NULL, NULL),
    -- Lead
    (NEWID(), 'Lead', 'credential', 'Drivers License', 'Drivers_License', NULL, NULL),
    (NEWID(), 'Lead', 'credential', 'Drug Screen', 'Drug_Screen', NULL, NULL),
    (NEWID(), 'Lead', 'credential', 'OSHA Training Cert', 'OSHA_Training_Cert', NULL, NULL),
    (NEWID(), 'Lead', 'credential', 'Background Check', 'Background_Check', NULL, NULL),
    (NEWID(), 'Lead', 'credential', 'Offer Letter', 'Offer_Letter', NULL, NULL),
    (NEWID(), 'Lead', 'equipment', 'Badge', NULL, 'badge', NULL),
    (NEWID(), 'Lead', 'equipment', 'Laptop', NULL, 'laptop', NULL),
    (NEWID(), 'Lead', 'competency', 'OTDR Knowledge', NULL, NULL, 'OTDR Knowledge'),
    (NEWID(), 'Lead', 'competency', 'Fiber Optic Characterization', NULL, NULL, 'Fiber Optic Characterization / OTDR Testing'),
    (NEWID(), 'Lead', 'prc', 'Initial PRC', NULL, NULL, NULL),
    -- Level1
    (NEWID(), 'Level1', 'credential', 'Drug Screen', 'Drug_Screen', NULL, NULL),
    (NEWID(), 'Level1', 'credential', 'Background Check', 'Background_Check', NULL, NULL),
    (NEWID(), 'Level1', 'equipment', 'Badge', NULL, 'badge', NULL),
    (NEWID(), 'Level1', 'competency', 'OTDR Knowledge', NULL, NULL, 'OTDR Knowledge'),
    (NEWID(), 'Level1', 'prc', 'Initial PRC', NULL, NULL, NULL),
    -- Level2
    (NEWID(), 'Level2', 'credential', 'Drug Screen', 'Drug_Screen', NULL, NULL),
    (NEWID(), 'Level2', 'credential', 'OSHA Training Cert', 'OSHA_Training_Cert', NULL, NULL),
    (NEWID(), 'Level2', 'credential', 'Background Check', 'Background_Check', NULL, NULL),
    (NEWID(), 'Level2', 'equipment', 'Badge', NULL, 'badge', NULL),
    (NEWID(), 'Level2', 'equipment', 'Laptop', NULL, 'laptop', NULL),
    (NEWID(), 'Level2', 'competency', 'OTDR Knowledge', NULL, NULL, 'OTDR Knowledge'),
    (NEWID(), 'Level2', 'prc', 'Initial PRC', NULL, NULL, NULL),
    -- Level3
    (NEWID(), 'Level3', 'credential', 'Drivers License', 'Drivers_License', NULL, NULL),
    (NEWID(), 'Level3', 'credential', 'Drug Screen', 'Drug_Screen', NULL, NULL),
    (NEWID(), 'Level3', 'credential', 'OSHA Training Cert', 'OSHA_Training_Cert', NULL, NULL),
    (NEWID(), 'Level3', 'credential', 'Background Check', 'Background_Check', NULL, NULL),
    (NEWID(), 'Level3', 'equipment', 'Badge', NULL, 'badge', NULL),
    (NEWID(), 'Level3', 'equipment', 'Laptop', NULL, 'laptop', NULL),
    (NEWID(), 'Level3', 'competency', 'OTDR Knowledge', NULL, NULL, 'OTDR Knowledge'),
    (NEWID(), 'Level3', 'competency', 'Fiber Optic Characterization', NULL, NULL, 'Fiber Optic Characterization / OTDR Testing'),
    (NEWID(), 'Level3', 'prc', 'Initial PRC', NULL, NULL, NULL),
    -- Level4
    (NEWID(), 'Level4', 'credential', 'Drivers License', 'Drivers_License', NULL, NULL),
    (NEWID(), 'Level4', 'credential', 'Drug Screen', 'Drug_Screen', NULL, NULL),
    (NEWID(), 'Level4', 'credential', 'OSHA Training Cert', 'OSHA_Training_Cert', NULL, NULL),
    (NEWID(), 'Level4', 'credential', 'Offer Letter', 'Offer_Letter', NULL, NULL),
    (NEWID(), 'Level4', 'credential', 'Background Check', 'Background_Check', NULL, NULL),
    (NEWID(), 'Level4', 'credential', 'SSN Last Four', 'SSN_Last_Four', NULL, NULL),
    (NEWID(), 'Level4', 'equipment', 'Badge', NULL, 'badge', NULL),
    (NEWID(), 'Level4', 'equipment', 'Laptop', NULL, 'laptop', NULL),
    (NEWID(), 'Level4', 'competency', 'OTDR Knowledge', NULL, NULL, 'OTDR Knowledge'),
    (NEWID(), 'Level4', 'competency', 'Fiber Optic Characterization', NULL, NULL, 'Fiber Optic Characterization / OTDR Testing'),
    (NEWID(), 'Level4', 'prc', 'Initial PRC', NULL, NULL, NULL);

PRINT 'Role credential templates inserted.';
PRINT '============================================================================';
PRINT 'SEED DATA COMPLETE';
PRINT '============================================================================';
