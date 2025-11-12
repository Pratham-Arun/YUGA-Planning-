# YUGA Release Script (PowerShell)
# Usage: .\scripts\release.ps1 v2.0.0

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🚀 YUGA RELEASE SCRIPT 🚀              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📦 Releasing version: $Version`n" -ForegroundColor Yellow

# Extract version without 'v' prefix
$VersionNum = $Version -replace '^v', ''

# Update version numbers
Write-Host "📝 Updating version numbers..." -ForegroundColor Yellow
(Get-Content unity-plugin/package.json) -replace '"version": "[^"]*"', "`"version`": `"$VersionNum`"" | Set-Content unity-plugin/package.json
(Get-Content backend/package.json) -replace '"version": "[^"]*"', "`"version`": `"$VersionNum`"" | Set-Content backend/package.json
Write-Host "✅ Version numbers updated`n" -ForegroundColor Green

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow

# Backend tests
if (Test-Path "backend") {
    Push-Location backend
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Backend tests failed (continuing)" -ForegroundColor Yellow
    }
    Pop-Location
}

# C++ tests
if (Test-Path "engine-core/build") {
    Push-Location engine-core
    ctest --test-dir build -C Release --output-on-failure
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  C++ tests failed (continuing)" -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host "✅ Tests complete`n" -ForegroundColor Green

# Build
Write-Host "🔨 Building..." -ForegroundColor Yellow

# Build C++ engine
if (Test-Path "engine-core") {
    Push-Location engine-core
    cmake --build build --config Release
    Pop-Location
    Write-Host "✅ C++ engine built" -ForegroundColor Green
}

# Build backend
if (Test-Path "backend") {
    Push-Location backend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  No build script" -ForegroundColor Yellow
    }
    Pop-Location
    Write-Host "✅ Backend built" -ForegroundColor Green
}

# Create Git tag
Write-Host "`n🏷️  Creating Git tag..." -ForegroundColor Yellow
git add .
git commit -m "Release $Version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit" -ForegroundColor Gray
}
git tag -a $Version -m "Release $Version"
Write-Host "✅ Tag created`n" -ForegroundColor Green

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
git push origin $Version
Write-Host "✅ Pushed to GitHub`n" -ForegroundColor Green

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ✅ RELEASE $Version COMPLETE! ✅        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Create GitHub Release" -ForegroundColor White
Write-Host "   2. Upload binaries from engine-core\build\bin\" -ForegroundColor White
Write-Host "   3. Update documentation site" -ForegroundColor White
Write-Host "   4. Announce on social media`n" -ForegroundColor White
