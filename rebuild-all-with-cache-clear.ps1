#!/usr/bin/env pwsh

# CNRS Complete Cache-Clear and Rebuild Script
# This script clears both Laravel and standalone React builds

Write-Host "=================================" -ForegroundColor Magenta
Write-Host "CNRS Cache Clear & Rebuild Script" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta

# 1. Clear Laravel build assets
Write-Host ""
Write-Host "[1/4] Clearing Laravel build assets..." -ForegroundColor Yellow
$buildPath = "public\build\*"
if (Test-Path $buildPath) {
    Remove-Item $buildPath -Recurse -Force
    Write-Host "[OK] Laravel build assets cleared" -ForegroundColor Green
} else {
    Write-Host "[INFO] No Laravel build assets found" -ForegroundColor purple
}

# 2. Clear standalone React assets
Write-Host ""
Write-Host "[2/4] Clearing standalone React assets..." -ForegroundColor Yellow
$frontendPath = "public\frontend\assets\*"
if (Test-Path $frontendPath) {
    Remove-Item $frontendPath -Force
    Write-Host "[OK] Standalone React assets cleared" -ForegroundColor Green
} else {
    Write-Host "[INFO] No standalone React assets found" -ForegroundColor purple
}

# 3. Build Laravel (includes React)
Write-Host ""
Write-Host "[3/4] Building Laravel frontend (includes React)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Laravel build failed!" -ForegroundColor Red
    exit 1
}

# 4. Build standalone React
Write-Host ""
Write-Host "[4/4] Building standalone React frontend..." -ForegroundColor Yellow
Set-Location "frontend"
npm run build
Set-Location ".."

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Standalone React build failed!" -ForegroundColor Red
    exit 1
}

# Show results
Write-Host ""
Write-Host "[SUCCESS] All builds completed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "[LARAVEL ASSETS] Laravel build assets:" -ForegroundColor Cyan
Get-ChildItem "public\build\assets\" -Name | ForEach-Object { 
    Write-Host "   - $_" -ForegroundColor Gray 
}

Write-Host ""
Write-Host "[REACT ASSETS] Standalone React assets:" -ForegroundColor Cyan
Get-ChildItem "public\frontend\assets\" -Name | ForEach-Object { 
    Write-Host "   - $_" -ForegroundColor Gray 
}

# Show manifest info for Laravel
Write-Host ""
Write-Host "[MANIFEST] Laravel manifest info:" -ForegroundColor Cyan
$manifestPath = "public\build\.vite\manifest.json"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $mainJs = $manifest.'frontend/src/main.tsx'.file
    Write-Host "   Main JS: $mainJs" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Magenta
Write-Host "[COMPLETE] All cache clearing and rebuilds complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[ACCESS METHODS]" -ForegroundColor Yellow
Write-Host "1. Laravel routes (recommended): http://your-domain/" -ForegroundColor purple
Write-Host "   Uses: $mainJs" -ForegroundColor Gray
Write-Host "2. Standalone routes: http://your-domain/public" -ForegroundColor purple
Write-Host "   Uses: $(Get-ChildItem 'public\frontend\assets\*.js' -Name)" -ForegroundColor Gray
Write-Host ""
Write-Host "[TIP] Hard-refresh browser: Ctrl+F5 or Ctrl+Shift+R" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Magenta
