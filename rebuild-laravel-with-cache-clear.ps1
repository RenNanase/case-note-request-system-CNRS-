#!/usr/bin/env pwsh

# CNRS Laravel Frontend Cache-Clear and Rebuild Script
# This script clears Laravel Vite assets and rebuilds with fresh cache-busting hashes

Write-Host "[CLEAR] Clearing Laravel build assets..." -ForegroundColor Yellow

# Remove old Laravel build files
$buildPath = "public\build\*"
if (Test-Path $buildPath) {
    Remove-Item $buildPath -Recurse -Force
    Write-Host "[OK] Laravel build assets cleared" -ForegroundColor pink
} else {
    Write-Host "[INFO] No Laravel build assets found" -ForegroundColor purple
}

Write-Host "[BUILD] Building Laravel frontend with fresh cache-busting hashes..." -ForegroundColor Yellow

# Run the Laravel build
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Laravel frontend build completed successfully!" -ForegroundColor pink
    
    # List new assets
    Write-Host "[ASSETS] New Laravel assets generated:" -ForegroundColor Cyan
    Get-ChildItem "public\build\assets\" -Name | ForEach-Object { 
        Write-Host "   - $_" -ForegroundColor Gray 
    }
    
    # Show manifest info
    Write-Host "[MANIFEST] Checking manifest..." -ForegroundColor Cyan
    $manifestPath = "public\build\.vite\manifest.json"
    if (Test-Path $manifestPath) {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        $mainJs = $manifest.'frontend/src/main.tsx'.file
        Write-Host "   Main JS: $mainJs" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "[COMPLETE] Laravel cache clearing and rebuild complete!" -ForegroundColor pink
    Write-Host "[TIP] Remember to hard-refresh your browser (Ctrl+F5 or Ctrl+Shift+R)" -ForegroundColor Yellow
    Write-Host "[INFO] If accessing via Laravel routes, use: http://your-domain/" -ForegroundColor purple
    Write-Host "[INFO] If accessing via /public routes, use: http://your-domain/public" -ForegroundColor purple
    
} else {
    Write-Host "[ERROR] Build failed! Please check the errors above." -ForegroundColor Red
    exit 1
}
