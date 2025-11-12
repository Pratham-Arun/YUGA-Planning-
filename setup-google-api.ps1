# YUGA - Google Gemini API Setup Script
# This script helps you set up the free Google Gemini API

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   YUGA - Google Gemini API Setup (FREE)       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Step 1: Opening Google AI Studio..." -ForegroundColor Yellow
Write-Host "  URL: https://makersuite.google.com/app/apikey`n" -ForegroundColor White

Start-Process "https://makersuite.google.com/app/apikey"
Start-Sleep -Seconds 2

Write-Host "Step 2: Get your API key" -ForegroundColor Yellow
Write-Host "  1. Sign in with your Google account" -ForegroundColor White
Write-Host "  2. Click 'Create API Key'" -ForegroundColor White
Write-Host "  3. Copy the key (starts with 'AI...')`n" -ForegroundColor White

Write-Host "Step 3: Enter your API key" -ForegroundColor Yellow
$apiKey = Read-Host "Paste your Google API key here"

if ($apiKey -match "^AI[a-zA-Z0-9_-]+$") {
    Write-Host "`n✓ Valid API key format!" -ForegroundColor Green
    
    # Update .env file
    $envPath = "backend\.env"
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace "YOUR_GOOGLE_API_KEY_HERE", $apiKey
    Set-Content -Path $envPath -Value $envContent
    
    Write-Host "✓ Updated backend\.env file" -ForegroundColor Green
    
    Write-Host "`nStep 4: Starting server..." -ForegroundColor Yellow
    Write-Host "  The backend will now use Google Gemini AI`n" -ForegroundColor White
    
    # Start the server
    Set-Location backend
    Write-Host "Starting YUGA Backend with Google Gemini...`n" -ForegroundColor Cyan
    node server.js
    
} else {
    Write-Host "`n✗ Invalid API key format" -ForegroundColor Red
    Write-Host "  API key should start with 'AI'" -ForegroundColor Yellow
    Write-Host "  Please try again`n" -ForegroundColor Yellow
}
