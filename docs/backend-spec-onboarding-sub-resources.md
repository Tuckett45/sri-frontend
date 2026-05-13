# Backend Spec: Onboarding Sub-Resource Endpoints

Complete API specification for credential details, equipment tracking, technical competencies, PRCs, and goals.

---

## Database Tables

### TechnicianCredentials

```sql
CREATE TABLE TechnicianCredentials (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TechnicianId UNIQUEIDENTIFIER NOT NULL,
    CredentialType NVARCHAR(30) NOT NULL,  -- 'Drivers_License', 'Drug_Screen', 'OSHA_Training_Cert', 'Offer_Letter', 'Background_Check', 'SSN_Last_Four'
    Name NVARCHAR(200) NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',  -- 'Active', 'ExpiringSoon', 'Expired'
    IssueDate DATE NULL,
    ExpirationDate DATE NULL,

    -- Type-specific fields (nullable, used based on CredentialType)
    LicenseNumber NVARCHAR(50) NULL,
    IssuingState NVARCHAR(5) NULL,
    TestDate DATE NULL,
    TestResult NVARCHAR(10) NULL,           -- 'pass', 'fail'
    TestingFacility NVARCHAR(200) NULL,
    CertificationNumber NVARCHAR(100) NULL,
    TrainingProvider NVARCHAR(200) NULL,
    OfferDate DATE NULL,
    AcceptedDate DATE NULL,
    OfferStatus NVARCHAR(20) NULL,          -- 'pending', 'accepted', 'declined'
    SubmissionDate DATE NULL,
    CompletionDate DATE NULL,
    BackgroundResult NVARCHAR(20) NULL,     -- 'pass', 'fail', 'pending'
    Provider NVARCHAR(200) NULL,
    LastFourDigits NVARCHAR(4) NULL,

    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_TechnicianCredentials_Technicians FOREIGN KEY (TechnicianId) REFERENCES Technicians(Id)
);
```

### EquipmentAssignments

```sql
CREATE TABLE EquipmentAssignments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TechnicianId UNIQUEIDENTIFIER NOT NULL,
    AssetType NVARCHAR(20) NOT NULL,        -- 'badge', 'laptop', 'other'
    AssetIdentifier NVARCHAR(100) NOT NULL,
    AssignmentDate DATE NOT NULL,
    ReturnDate DATE NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'assigned',  -- 'assigned', 'returned', 'lost'
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_EquipmentAssignments_Technicians FOREIGN KEY (TechnicianId) REFERENCES Technicians(Id)
);

CREATE UNIQUE INDEX IX_EquipmentAssignments_ActiveAsset
    ON EquipmentAssignments(AssetIdentifier)
    WHERE Status = 'assigned';
```

### TechnicalCompetencies

```sql
CREATE TABLE TechnicalCompetencies (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TechnicianId UNIQUEIDENTIFIER NOT NULL,
    CompetencyName NVARCHAR(200) NOT NULL,
    VerificationDate DATE NOT NULL,
    VerifiedBy NVARCHAR(200) NOT NULL,
    ProficiencyLevel NVARCHAR(20) NOT NULL,  -- 'beginner', 'intermediate', 'advanced', 'expert'
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_TechnicalCompetencies_Technicians FOREIGN KEY (TechnicianId) REFERENCES Technicians(Id)
);
```

### PerformanceReviewCycles (PRC)

```sql
CREATE TABLE PerformanceReviewCycles (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TechnicianId UNIQUEIDENTIFIER NOT NULL,
    DueDate DATE NOT NULL,
    CompletionDate DATE NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'upcoming',  -- 'upcoming', 'overdue', 'completed'
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_PRC_Technicians FOREIGN KEY (TechnicianId) REFERENCES Technicians(Id)
);
```

### PRCGoals

```sql
CREATE TABLE PRCGoals (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PrcId UNIQUEIDENTIFIER NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    TargetDate DATE NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed'
    CompletionNotes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_PRCGoals_PRC FOREIGN KEY (PrcId) REFERENCES PerformanceReviewCycles(Id) ON DELETE CASCADE
);
```

### RoleCredentialTemplates

```sql
CREATE TABLE RoleCredentialTemplates (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Role NVARCHAR(20) NOT NULL,
    Category NVARCHAR(20) NOT NULL,         -- 'credential', 'equipment', 'competency', 'prc'
    Name NVARCHAR(200) NOT NULL,
    CredentialType NVARCHAR(30) NULL,
    AssetType NVARCHAR(20) NULL,
    CompetencyName NVARCHAR(200) NULL
);
```

---

## API Endpoints

All under `/v1/technicians`

---

### Credentials

#### GET /v1/technicians/{id}/certifications

Returns all credentials for a technician.

**Response:** `200 OK`
```json
[
  {
    "id": "guid",
    "technicianId": "guid",
    "credentialType": "Drivers_License",
    "name": "Texas Drivers License",
    "status": "Active",
    "issueDate": "2025-06-01",
    "expirationDate": "2027-06-01",
    "licenseNumber": "DL-98234571",
    "issuingState": "TX",
    "createdAt": "2025-06-01T10:00:00Z",
    "updatedAt": "2025-06-01T10:00:00Z"
  }
]
```

#### POST /v1/technicians/{id}/certifications

Creates a new credential.

**Request:**
```json
{
  "credentialType": "Drug_Screen",
  "name": "Pre-Employment Drug Screen",
  "testDate": "2026-05-01",
  "result": "pass",
  "testingFacility": "LabCorp Dallas"
}
```

**Response:** `201 Created` — the created credential

**Validation:**
- `credentialType` required, must be one of: `Drivers_License`, `Drug_Screen`, `OSHA_Training_Cert`, `Offer_Letter`, `Background_Check`, `SSN_Last_Four`
- `name` required
- Type-specific required fields vary by credentialType

#### PUT /v1/technicians/{id}/certifications/{certId}

Updates an existing credential. Partial update.

**Response:** `200 OK` — the updated credential

#### DELETE /v1/technicians/{id}/certifications/{certId}

**Response:** `204 No Content`

---

### Equipment

#### GET /v1/technicians/{id}/equipment

Returns all equipment assignments for a technician.

**Response:** `200 OK`
```json
[
  {
    "id": "guid",
    "technicianId": "guid",
    "assetType": "laptop",
    "assetIdentifier": "LAPTOP-DL-4521",
    "assignmentDate": "2025-01-10",
    "returnDate": null,
    "status": "assigned",
    "notes": "Dell Latitude 5540",
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-10T09:00:00Z"
  }
]
```

#### POST /v1/technicians/{id}/equipment

Assigns new equipment.

**Request:**
```json
{
  "assetType": "badge",
  "assetIdentifier": "BADGE-1234",
  "assignmentDate": "2026-05-13",
  "notes": "Building access badge"
}
```

**Validation:**
- `assetType` required: `badge`, `laptop`, `other`
- `assetIdentifier` required, must be unique among active assignments
- `assignmentDate` required

**Response:** `201 Created`

#### PUT /v1/technicians/{id}/equipment/{equipmentId}

Updates equipment (status change, return date, notes).

**Request:**
```json
{
  "status": "returned",
  "returnDate": "2026-05-13"
}
```

**Response:** `200 OK`

#### GET /v1/technicians/equipment/validate/{assetIdentifier}?excludeTechnicianId={id}

Validates asset identifier uniqueness.

**Response:** `200 OK` — `true` (unique) or `false` (duplicate)

---

### Competencies

#### GET /v1/technicians/{id}/competencies

Returns all technical competencies for a technician.

**Response:** `200 OK`
```json
[
  {
    "id": "guid",
    "technicianId": "guid",
    "competencyName": "OTDR Knowledge",
    "verificationDate": "2026-03-15",
    "verifiedBy": "John Smith",
    "proficiencyLevel": "advanced",
    "notes": "Passed field assessment",
    "createdAt": "2026-03-15T10:00:00Z",
    "updatedAt": "2026-03-15T10:00:00Z"
  }
]
```

#### POST /v1/technicians/{id}/competencies

Adds a new competency.

**Request:**
```json
{
  "competencyName": "OTDR Knowledge",
  "verificationDate": "2026-05-13",
  "verifiedBy": "Jane Doe",
  "proficiencyLevel": "intermediate",
  "notes": "Completed training module"
}
```

**Validation:**
- `competencyName` required
- `verificationDate` required
- `verifiedBy` required
- `proficiencyLevel` required: `beginner`, `intermediate`, `advanced`, `expert`

**Response:** `201 Created`

#### PUT /v1/technicians/{id}/competencies/{competencyId}

Updates a competency (proficiency level, notes, etc).

**Response:** `200 OK`

---

### PRC (Performance Review Cycles)

#### GET /v1/technicians/{id}/prc

Returns the current PRC for a technician (most recent non-completed, or latest completed).

**Response:** `200 OK` — single PRC object with nested goals, or `null`
```json
{
  "id": "guid",
  "technicianId": "guid",
  "dueDate": "2026-07-15",
  "completionDate": null,
  "status": "upcoming",
  "goals": [
    {
      "id": "guid",
      "prcId": "guid",
      "description": "Complete OTDR certification",
      "targetDate": "2026-06-30",
      "status": "in_progress",
      "completionNotes": null,
      "createdAt": "2026-05-01T10:00:00Z",
      "updatedAt": "2026-05-10T14:00:00Z"
    }
  ],
  "createdAt": "2026-05-01T10:00:00Z",
  "updatedAt": "2026-05-01T10:00:00Z"
}
```

**Important:** Return `null` (not 404) if no PRC exists.

#### POST /v1/technicians/{id}/prc

Creates a new PRC.

**Request:**
```json
{
  "dueDate": "2026-07-15",
  "status": "upcoming"
}
```

**Response:** `201 Created` — PRC with empty goals array

#### PUT /v1/technicians/{id}/prc/{prcId}/complete

Marks a PRC as completed and creates the next cycle.

**Request:**
```json
{
  "completionDate": "2026-05-13T00:00:00Z"
}
```

**Behavior:**
1. Set current PRC `status = 'completed'`, `completionDate = request.completionDate`
2. Create a new PRC with `dueDate = completionDate + 60 days`, `status = 'upcoming'`, empty goals
3. Return the new PRC

**Response:** `200 OK` — the newly created next PRC

---

### PRC Goals

#### POST /v1/technicians/{id}/prc/{prcId}/goals

Adds a goal to a PRC.

**Request:**
```json
{
  "description": "Complete advanced OTDR certification",
  "targetDate": "2026-06-30",
  "status": "not_started"
}
```

**Validation:**
- `description` required, non-empty
- `targetDate` required
- `status` defaults to `not_started`

**Response:** `201 Created`

#### PUT /v1/technicians/{id}/prc/{prcId}/goals/{goalId}

Updates a goal (status change, completion notes).

**Request:**
```json
{
  "status": "completed",
  "completionNotes": "Passed with distinction"
}
```

**Response:** `200 OK`

---

### Role Templates

#### GET /v1/technicians/role-templates/{role}

Returns the onboarding checklist template for a role.

**URL param:** `role` — one of: `Installer`, `Lead`, `Level1`, `Level2`, `Level3`, `Level4`

**Response:** `200 OK`
```json
{
  "role": "Lead",
  "requiredItems": [
    { "category": "credential", "name": "Drivers License", "credentialType": "Drivers_License", "assetType": null, "competencyName": null },
    { "category": "credential", "name": "Drug Screen", "credentialType": "Drug_Screen", "assetType": null, "competencyName": null },
    { "category": "credential", "name": "OSHA Training Cert", "credentialType": "OSHA_Training_Cert", "assetType": null, "competencyName": null },
    { "category": "credential", "name": "Background Check", "credentialType": "Background_Check", "assetType": null, "competencyName": null },
    { "category": "credential", "name": "Offer Letter", "credentialType": "Offer_Letter", "assetType": null, "competencyName": null },
    { "category": "equipment", "name": "Badge", "credentialType": null, "assetType": "badge", "competencyName": null },
    { "category": "equipment", "name": "Laptop", "credentialType": null, "assetType": "laptop", "competencyName": null },
    { "category": "competency", "name": "OTDR Knowledge", "credentialType": null, "assetType": null, "competencyName": "OTDR Knowledge" },
    { "category": "competency", "name": "Fiber Optic Characterization", "credentialType": null, "assetType": null, "competencyName": "Fiber Optic Characterization / OTDR Testing" },
    { "category": "prc", "name": "Performance Review Cycle", "credentialType": null, "assetType": null, "competencyName": null }
  ]
}
```

**Note:** This can be hardcoded initially or stored in the `RoleCredentialTemplates` table.

---

## Authorization

| Endpoint | Admin | Manager/CM | Technician |
|----------|-------|-----------|------------|
| GET (all) | ✅ | ✅ (own market) | ✅ (self only) |
| POST/PUT/DELETE credentials | ✅ | ✅ (own market) | ❌ |
| POST/PUT equipment | ✅ | ✅ (own market) | ❌ |
| POST/PUT competencies | ✅ | ✅ (own market) | ❌ |
| POST/PUT PRC & goals | ✅ | ✅ (own market) | ❌ |
| GET role-templates | ✅ | ✅ | ✅ |

---

## Key Behaviors

1. **Credential status computation:** The backend should compute `status` based on `expirationDate`:
   - `Active` — expiration > 30 days from now
   - `ExpiringSoon` — expiration within 30 days
   - `Expired` — expiration in the past

2. **PRC status computation:** Compute on read:
   - `upcoming` — dueDate in the future, no completionDate
   - `overdue` — dueDate in the past, no completionDate
   - `completed` — completionDate is set

3. **Equipment uniqueness:** The `AssetIdentifier` must be unique among all assignments with `Status = 'assigned'`. The unique index enforces this at the DB level.

4. **PRC cycle:** When a PRC is completed, automatically create the next one due in 60 days.

5. **Return empty arrays, not 404:** For GET list endpoints, return `[]` if no records exist. Only return 404 for single-resource GETs where the ID doesn't exist.
