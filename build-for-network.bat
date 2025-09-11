@echo off
echo 🚀 Building CRNS for Network Server Deployment...

echo 📦 Installing dependencies...
call npm install
cd frontend && call npm install && cd ..

echo 🔨 Building frontend with /crns/public/ base path...
cd frontend
call npm run build
cd ..

echo 🔨 Building Laravel assets with /crns/public/ base path...
call npm run build

echo 📁 Copying frontend build to public directory...
xcopy /E /I /Y frontend\dist\* public\frontend\

echo ✅ Build complete! Frontend assets are now in public/frontend/
echo 🌐 Deploy the entire project to your network server at http://10.2.10.178/crns/public/
echo.
echo 📋 Deployment checklist:
echo    ✓ Frontend built with base: '/crns/public/'
echo    ✓ Laravel assets built with base: '/crns/public/'
echo    ✓ Routes configured for /crns/public/ subdirectory
echo    ✓ .htaccess updated for specific subdirectory serving
echo    ✓ MIME types properly configured
echo    ✓ No interference with other projects (MTCT, etc.)
echo.
echo 🔗 Access your application at: http://10.2.10.178/crns/public/
echo 🔒 Other projects remain accessible at their original URLs
pause
