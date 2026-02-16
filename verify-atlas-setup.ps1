# ATLAS Branding Setup Verification Script
# Run this script to verify all ATLAS branding files are in place

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ATLAS Branding Setup Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check SCSS files
Write-Host "Checking SCSS files..." -ForegroundColor Yellow
$scssFiles = @(
    "src\styles\_atlas-variables.scss",
    "src\styles\_atlas-components.scss"
)

foreach ($file in $scssFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (MISSING)" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# Check component files
Write-Host "Checking component files..." -ForegroundColor Yellow
$componentFiles = @(
    "src\app\features\atlas\components\atlas-logo\atlas-logo.component.ts",
    "src\app\features\atlas\components\atlas-logo\atlas-logo.component.html",
    "src\app\features\atlas\components\atlas-logo\atlas-logo.component.scss",
    "src\app\features\atlas\components\atlas-logo\atlas-logo.component.spec.ts",
    "src\app\features\atlas\components\atlas-header-example.component.ts",
    "src\app\features\atlas\atlas-shared.module.ts"
)

foreach ($file in $componentFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (MISSING)" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# Check documentation files
Write-Host "Checking documentation files..." -ForegroundColor Yellow
$docFiles = @(
    "src\app\features\atlas\README.md",
    "src\assets\images\atlas\README.md",
    "src\assets\images\atlas\SETUP.md",
    "ATLAS_BRANDING_SETUP.md"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (MISSING)" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# Check logo images (these are expected to be missing initially)
Write-Host "Checking logo images..." -ForegroundColor Yellow
$logoFiles = @(
    "src\assets\images\atlas\atlas-logo-light.png",
    "src\assets\images\atlas\atlas-logo-dark.png"
)

$logosPresent = $true
foreach ($file in $logoFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $file (PENDING - needs to be added)" -ForegroundColor Yellow
        $logosPresent = $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allGood -and $logosPresent) {
    Write-Host "✓ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "ATLAS branding is fully set up and ready to use." -ForegroundColor Green
} elseif ($allGood) {
    Write-Host "✓ SETUP COMPLETE (pending logo images)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Action Required:" -ForegroundColor Yellow
    Write-Host "  1. Add atlas-logo-light.png to src\assets\images\atlas\" -ForegroundColor White
    Write-Host "  2. Add atlas-logo-dark.png to src\assets\images\atlas\" -ForegroundColor White
    Write-Host ""
    Write-Host "See ATLAS_BRANDING_SETUP.md for details." -ForegroundColor White
} else {
    Write-Host "✗ SETUP INCOMPLETE" -ForegroundColor Red
    Write-Host "Some required files are missing. Please check the output above." -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Display next steps
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Add the ATLAS logo images (see above)" -ForegroundColor White
Write-Host "  2. Import AtlasSharedModule in your feature modules" -ForegroundColor White
Write-Host "  3. Use <app-atlas-logo> component in your templates" -ForegroundColor White
Write-Host "  4. Apply ATLAS CSS classes for styling" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  • Developer Guide: src\app\features\atlas\README.md" -ForegroundColor White
Write-Host "  • Setup Summary: ATLAS_BRANDING_SETUP.md" -ForegroundColor White
Write-Host ""
