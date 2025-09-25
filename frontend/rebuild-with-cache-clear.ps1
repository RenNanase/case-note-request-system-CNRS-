#!/usr/bin/env pwsh

# CNRS Frontend Cache-Clear and Rebuild Script
# This script clears old assets and rebuilds with fresh cache-busting hashes

Write-Host "[CLEAR] Clearing old frontend assets..." -ForegroundColor Yellow

# Remove old asset files
$assetsPath = "..\public\frontend\assets\*"
if (Test-Path $assetsPath) {
    Remove-Item $assetsPath -Force
    Write-Host "[OK] Old assets cleared" -ForegroundColor Green
} else {
    Write-Host "[INFO] No old assets found" -ForegroundColor purple
}

Write-Host "[BUILD] Building frontend with fresh cache-busting hashes..." -ForegroundColor Yellow

# Run the build
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Frontend build completed successfully!" -ForegroundColor Green
    
    # List new assets
    Write-Host "[ASSETS] New assets generated:" -ForegroundColor Cyan
    Get-ChildItem "..\public\frontend\assets\" -Name | ForEach-Object { 
        Write-Host "   - $_" -ForegroundColor Gray 
    }
    
    Write-Host ""
    Write-Host "[COMPLETE] Cache clearing and rebuild complete!" -ForegroundColor Green
    Write-Host "[TIP] Remember to hard-refresh your browser (Ctrl+F5 or Ctrl+Shift+R)" -ForegroundColor Yellow
    
} else {
    Write-Host "[ERROR] Build failed! Please check the errors above." -ForegroundColor Red
    exit 1
}
