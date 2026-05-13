# Backend Stubs: Technician Sub-Resource Endpoints

Add these to your `TechniciansController.cs` to return hardcoded sample data so the frontend onboarding page works immediately.

## Controller Code (C#)

```csharp
// Add these action methods to your existing TechniciansController

[HttpGet("{id}/competencies")]
public IActionResult GetCompetencies(Guid id)
{
    var competencies = new[]
    {
        new
        {
            id = Guid.NewGuid(),
            technicianId = id,
            competencyName = "OTDR Knowledge",
            verificationDate = DateTime.UtcNow.AddDays(-90).ToString("yyyy-MM-dd"),
            verifiedBy = "John Smith",
            proficiencyLevel = "advanced",
            notes = "Demonstrated strong OTDR testing skills",
            createdAt = DateTime.UtcNow.AddDays(-90),
            updatedAt = DateTime.UtcNow.AddDays(-90)
        },
        new
        {
            id = Guid.NewGuid(),
            technicianId = id,
            competencyName = "Fiber Optic Characterization / OTDR Testing",
            verificationDate = DateTime.UtcNow.AddDays(-60).ToString("yyyy-MM-dd"),
            verifiedBy = "Jane Doe",
            proficiencyLevel = "intermediate",
            notes = (string?)null,
            createdAt = DateTime.UtcNow.AddDays(-60),
            updatedAt = DateTime.UtcNow.AddDays(-60)
        }
    };

    return Ok(competencies);
}

[HttpGet("{id}/equipment")]
public IActionResult GetEquipment(Guid id)
{
    var equipment = new[]
    {
        new
        {
            id = Guid.NewGuid(),
            technicianId = id,
            assetType = "badge",
            assetIdentifier = $"BADGE-{id.ToString()[..4].ToUpper()}",
            assignmentDate = DateTime.UtcNow.AddDays(-180).ToString("yyyy-MM-dd"),
            returnDate = (string?)null,
            status = "assigned",
            notes = "Building access badge",
            createdAt = DateTime.UtcNow.AddDays(-180),
            updatedAt = DateTime.UtcNow.AddDays(-180)
        },
        new
        {
            id = Guid.NewGuid(),
            technicianId = id,
            assetType = "laptop",
            assetIdentifier = $"LAPTOP-{id.ToString()[..4].ToUpper()}",
            assignmentDate = DateTime.UtcNow.AddDays(-180).ToString("yyyy-MM-dd"),
            returnDate = (string?)null,
            status = "assigned",
            notes = "Dell Latitude 5540",
            createdAt = DateTime.UtcNow.AddDays(-180),
            updatedAt = DateTime.UtcNow.AddDays(-180)
        }
    };

    return Ok(equipment);
}

[HttpGet("{id}/prc")]
public IActionResult GetPrc(Guid id)
{
    var prc = new
    {
        id = Guid.NewGuid(),
        technicianId = id,
        dueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd"),
        completionDate = (string?)null,
        status = "upcoming",
        goals = new[]
        {
            new
            {
                id = Guid.NewGuid(),
                prcId = Guid.NewGuid(),
                description = "Complete advanced OTDR certification",
                targetDate = DateTime.UtcNow.AddDays(25).ToString("yyyy-MM-dd"),
                status = "in_progress",
                completionNotes = (string?)null,
                createdAt = DateTime.UtcNow.AddDays(-30),
                updatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new
            {
                id = Guid.NewGuid(),
                prcId = Guid.NewGuid(),
                description = "Achieve zero rework rate on installations",
                targetDate = DateTime.UtcNow.AddDays(20).ToString("yyyy-MM-dd"),
                status = "not_started",
                completionNotes = (string?)null,
                createdAt = DateTime.UtcNow.AddDays(-30),
                updatedAt = DateTime.UtcNow.AddDays(-30)
            }
        },
        createdAt = DateTime.UtcNow.AddDays(-30),
        updatedAt = DateTime.UtcNow.AddDays(-5)
    };

    return Ok(prc);
}

[HttpGet("role-templates/{role}")]
public IActionResult GetRoleTemplate(string role)
{
    var requiredItems = new List<object>
    {
        new { category = "credential", name = "Drivers License", credentialType = "Drivers_License", assetType = (string?)null, competencyName = (string?)null },
        new { category = "credential", name = "Drug Screen", credentialType = "Drug_Screen", assetType = (string?)null, competencyName = (string?)null },
        new { category = "credential", name = "OSHA Training Cert", credentialType = "OSHA_Training_Cert", assetType = (string?)null, competencyName = (string?)null },
        new { category = "credential", name = "Background Check", credentialType = "Background_Check", assetType = (string?)null, competencyName = (string?)null },
        new { category = "equipment", name = "Badge", credentialType = (string?)null, assetType = "badge", competencyName = (string?)null },
        new { category = "equipment", name = "Laptop", credentialType = (string?)null, assetType = "laptop", competencyName = (string?)null },
        new { category = "competency", name = "OTDR Knowledge", credentialType = (string?)null, assetType = (string?)null, competencyName = "OTDR Knowledge" },
        new { category = "competency", name = "Fiber Optic Characterization", credentialType = (string?)null, assetType = (string?)null, competencyName = "Fiber Optic Characterization / OTDR Testing" },
        new { category = "prc", name = "Performance Review Cycle", credentialType = (string?)null, assetType = (string?)null, competencyName = (string?)null }
    };

    // Add Offer Letter for Lead and Level4 roles
    if (role.Equals("Lead", StringComparison.OrdinalIgnoreCase) || role.Equals("Level4", StringComparison.OrdinalIgnoreCase))
    {
        requiredItems.Insert(4, new { category = "credential", name = "Offer Letter", credentialType = "Offer_Letter", assetType = (string?)null, competencyName = (string?)null });
    }

    return Ok(new { role, requiredItems });
}
```

## Notes

- These are **hardcoded stubs** — replace with real database queries when ready.
- The frontend mock interceptor already has this same data, so if you're running without the backend, it works too.
- The `role-templates` endpoint defines what's required for onboarding completion. The frontend compares this template against the technician's actual competencies/equipment/credentials to compute the completion percentage.
- Return empty arrays `[]` for competencies/equipment if a technician has none — don't return 404.
- Return `null` for PRC if a technician doesn't have one yet — don't return 404.
