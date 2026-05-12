# Backend Spec: Referral Tracker API

## Overview

The frontend onboarding module now includes a Referral Tracker that allows managers to track technician referrals and bulk-import them from spreadsheets (matching the SRI Referral Tracker Excel template). This document specifies everything needed on the backend to support it.

---

## Database Table

```sql
CREATE TABLE Referrals (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    Phone NVARCHAR(50) NOT NULL,
    CityState NVARCHAR(200) NULL,
    WillingToTravel BIT NULL,
    ReferredFrom NVARCHAR(200) NOT NULL,
    Onboarded BIT NOT NULL DEFAULT 0,
    Status NVARCHAR(20) NOT NULL DEFAULT 'new',
    Notes NVARCHAR(1000) NULL,
    CreatedBy NVARCHAR(200) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy NVARCHAR(200) NOT NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```

**Status values:** `new`, `contacted`, `onboarded`, `declined`

**WillingToTravel:** `NULL` means unknown/not answered, `1` = yes, `0` = no

---

## Entity Model (C#)

```csharp
public class Referral
{
    public Guid Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Phone { get; set; }
    public string? CityState { get; set; }
    public bool? WillingToTravel { get; set; }
    public string ReferredFrom { get; set; }
    public bool Onboarded { get; set; }
    public string Status { get; set; }
    public string? Notes { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public string UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

---

## DTOs (C#)

```csharp
public class CreateReferralDto
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Phone { get; set; }
    public string? CityState { get; set; }
    public bool? WillingToTravel { get; set; }
    public string ReferredFrom { get; set; }
    public string? Notes { get; set; }
    // Audit fields sent by frontend
    public string UserName { get; set; }
    public string Timestamp { get; set; }
}

public class UpdateReferralDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? CityState { get; set; }
    public bool? WillingToTravel { get; set; }
    public string? ReferredFrom { get; set; }
    public bool? Onboarded { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    // Audit fields sent by frontend
    public string UserName { get; set; }
    public string Timestamp { get; set; }
}

public class BulkImportReferralsDto
{
    public List<BulkImportReferralItem> Referrals { get; set; }
    public string ImportedBy { get; set; }
    public string ImportedAt { get; set; }
}

public class BulkImportReferralItem
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Phone { get; set; }
    public string? CityState { get; set; }
    public bool? WillingToTravel { get; set; }
    public string ReferredFrom { get; set; }
    public string? Notes { get; set; }
}
```

---

## API Endpoints

All endpoints are under: **`/v1/onboarding/referrals`**

### GET /v1/onboarding/referrals

Returns all referrals, optionally filtered.

| Query Param | Type | Description |
|-------------|------|-------------|
| `search` | string | Case-insensitive contains on name, email, or referrer |
| `status` | string | One of: `new`, `contacted`, `onboarded`, `declined` |
| `onboarded` | bool | Filter by onboarded flag |
| `willingToTravel` | bool | Filter by travel willingness |

**Response:** `200 OK` — array of Referral objects

---

### GET /v1/onboarding/referrals/{id}

Returns a single referral by ID.

**Response:** `200 OK` — single Referral object  
**Errors:** `404 Not Found`

---

### POST /v1/onboarding/referrals

Creates a single referral.

**Request Body:**
```json
{
  "firstName": "Paul",
  "lastName": "Tran",
  "email": "cuongpaultran@yahoo.com",
  "phone": "850-516-2987",
  "cityState": "",
  "willingToTravel": true,
  "referredFrom": "Duong Tran",
  "notes": null,
  "userName": "Admin User",
  "timestamp": "2026-05-11T15:00:00Z"
}
```

**Validation:**
- `firstName` — required, non-empty
- `lastName` — required, non-empty
- `email` — required, valid email format
- `phone` — required, non-empty
- `referredFrom` — required, non-empty
- `willingToTravel` — nullable boolean (true/false/null all valid)
- `notes` — optional, max 1000 chars

**Behavior:**
- Set `Status` = `"new"`
- Set `Onboarded` = `false`
- Set `CreatedBy` / `UpdatedBy` = `dto.UserName`
- Set `CreatedAt` / `UpdatedAt` = UTC now

**Response:** `201 Created` — the created Referral object  
**Errors:** `400 Bad Request` for validation failures

---

### PUT /v1/onboarding/referrals/{id}

Updates an existing referral. All fields are optional (partial update — only apply non-null fields).

**Request Body:**
```json
{
  "status": "contacted",
  "onboarded": false,
  "userName": "Admin User",
  "timestamp": "2026-05-11T16:00:00Z"
}
```

**Behavior:**
- Only update fields that are present and non-null in the request
- Set `UpdatedBy` = `dto.UserName`
- Set `UpdatedAt` = UTC now

**Response:** `200 OK` — the updated Referral object  
**Errors:** `404 Not Found`, `400 Bad Request`

---

### DELETE /v1/onboarding/referrals/{id}

Deletes a referral.

**Response:** `204 No Content`  
**Errors:** `404 Not Found`

---

### POST /v1/onboarding/referrals/import

Bulk imports multiple referrals from a parsed spreadsheet.

**Request Body:**
```json
{
  "referrals": [
    {
      "firstName": "Kenneth",
      "lastName": "Williams",
      "email": "kenn.r.rwilliams@gmail.com",
      "phone": "303-908-7690",
      "cityState": "Denver, CO",
      "willingToTravel": null,
      "referredFrom": "Dean Hawkins"
    },
    {
      "firstName": "Paul",
      "lastName": "Tran",
      "email": "cuongpaultran@yahoo.com",
      "phone": "850-516-2987",
      "cityState": "",
      "willingToTravel": true,
      "referredFrom": "Duong Tran"
    },
    {
      "firstName": "Minh",
      "lastName": "Duong",
      "email": "ltefortworth@gmail.com",
      "phone": "352-978-7511",
      "cityState": "Webster, FL",
      "willingToTravel": true,
      "referredFrom": "Dinh Nguyen"
    },
    {
      "firstName": "Christoper",
      "lastName": "Charles",
      "email": "chrischarles904@gmail.com",
      "phone": "228-363-0104",
      "cityState": "Picayune, MS",
      "willingToTravel": true,
      "referredFrom": "Jimmy Charles"
    },
    {
      "firstName": "Phi",
      "lastName": "Hoang",
      "email": "phi850@hotmail.com",
      "phone": "850-572-1720",
      "cityState": "",
      "willingToTravel": null,
      "referredFrom": "Khanh Nguyen"
    }
  ],
  "importedBy": "Admin User",
  "importedAt": "2026-05-11T15:00:00Z"
}
```

**Validation (per row):**
- Same rules as single create (firstName, lastName, email, phone, referredFrom required)
- Rows that fail validation are skipped (not inserted)

**Behavior:**
- Skip duplicates by email (if a referral with the same email already exists in the DB, skip it)
- Set `Status` = `"new"` for all imported rows
- Set `Onboarded` = `false` for all imported rows
- Set `CreatedBy` / `UpdatedBy` = `dto.ImportedBy`
- Set `CreatedAt` / `UpdatedAt` = UTC now

**Response:** `200 OK` — array of Referral objects that were actually inserted (excludes skipped duplicates)
```json
[
  { "id": "guid", "firstName": "Kenneth", "lastName": "Williams", ... },
  { "id": "guid", "firstName": "Paul", "lastName": "Tran", ... }
]
```

**Errors:** `400 Bad Request` if `referrals` array is empty or all rows fail validation

---

## Authorization

| Role | Permissions |
|------|-------------|
| Admin | Full CRUD + Import |
| Manager | Full CRUD + Import |
| Backoffice | Full CRUD + Import |
| Technician | Read-only (GET endpoints only) |

---

## Response Shape (all endpoints returning referral data)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "firstName": "Kenneth",
  "lastName": "Williams",
  "email": "kenn.r.rwilliams@gmail.com",
  "phone": "303-908-7690",
  "cityState": "Denver, CO",
  "willingToTravel": null,
  "referredFrom": "Dean Hawkins",
  "onboarded": false,
  "status": "new",
  "notes": null,
  "createdBy": "Admin User",
  "createdAt": "2026-05-11T15:00:00Z",
  "updatedBy": "Admin User",
  "updatedAt": "2026-05-11T15:00:00Z"
}
```

---

## Frontend Route

The referral tracker is accessible at: `/onboarding/referrals`

The frontend handles all spreadsheet parsing client-side (tab-separated or comma-separated text). It sends only validated, structured JSON to the import endpoint. The expected spreadsheet column order matches the SRI Referral Tracker template:

| First Name | Last Name | Email | Phone Number | City, State | Willing to Travel (Yes/No/?) | Referred From | Onboarded (Yes/No) |
