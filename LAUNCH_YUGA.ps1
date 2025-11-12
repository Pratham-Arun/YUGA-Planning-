#!/usr/bin/env pwsh
# YUGA Engine Launcher
# Quick start script for the YUGA desktop application

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "║      🎮 YUGA ENGINE - AI-Powered Game Development        ║" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$appPath = "engine-core/examples/yuga-ai-gamecraft-main"

# Check if path exists
if (-not (Test-Path $appPath)) {
    Write-Host "❌ Error: Application path not found!" -ForegroundColor Red
    Write-Host "   Expected: $appPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Checking installation..." -ForegroundColor Yellow

# Check if node_modules exists
if (-not (Test-Path "$appPath/node_modules")) {
    Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
    Set-Location $appPath
    npm install --legacy-peer-deps
    Set-Location ../../../
}

Write-Host "✅ Dependencies ready!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting YUGA Engine..." -ForegroundColor Cyan
Write-Host ""
Write-Host "   Features Available:" -ForegroundColor White
Write-Host "   • 3D Scene Editor (Fully Working)" -ForegroundColor Green
Write-Host "   • User Authentication" -ForegroundColor Green
Write-Host "   • Project Dashboard" -ForegroundColor Green
Write-Host "   • Professional UI" -ForegroundColor Green
Write-Host ""
Write-Host "   Controls:" -ForegroundColor White
Write-Host "   • Left Click + Drag: Rotate camera" -ForegroundColor Gray
Write-Host "   • Right Click + Drag: Pan view" -ForegroundColor Gray
Write-Host "   • Scroll: Zoom in/out" -ForegroundColor Gray
Write-Host ""
Write-Host "🔄 Launching desktop app..." -ForegroundColor Yellow
Write-Host ""

# Start dev server in background
$devServer = Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$appPath'; npm run dev" -PassThru -WindowStyle Minimized

# Wait for server to start
Write-Host "⏳ Waiting for dev server..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Launch Electron app
Set-Location $appPath
npm run electron

# Cleanup
Write-Host ""
Write-Host "👋 Closing YUGA Engine..." -ForegroundColor Yellow
Stop-Process -Id $devServer.Id -ErrorAction SilentlyContinue

Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
