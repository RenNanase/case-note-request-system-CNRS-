# Simple CRNS Deployment Guide

## Overview
This guide shows how to deploy CRNS to your network server at `http://10.2.10.178/crns/` WITHOUT interfering with other projects like MTCT system.

## Key Principle
**CRNS will be completely self-contained in the `/crns/` subdirectory and won't touch any other projects on your server.**

## Deployment Steps

### Step 1: Build the Application
```bash
# Use the provided build script
./build-crns.sh

# Or manually:
npm install
cd frontend && npm install && cd ..
cd frontend && npm run build && cd ..
npm run build
cp -r frontend/dist/* public/frontend/
```

### Step 2: Deploy to Server
1. Copy the entire CRNS project to your server
2. Place it in a directory that will be accessible via: `http://10.2.10.178/crns/`
3. **Important**: The `public/` folder should be the web root for the `/crns/` subdirectory

### Step 3: Configure Web Server (Apache)
You need to configure Apache to serve the CRNS project from the `/crns/` subdirectory:

```apache
# In your Apache configuration (httpd.conf or virtual host)
Alias /crns /path/to/your/server/crns/public

<Directory "/path/to/your/server/crns/public">
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```

## How It Works

### Frontend Serving
- Frontend files are served directly by Apache from `public/frontend/`
- Assets are loaded with `/crns/` base path (e.g., `/crns/assets/index-xxx.js`)
- No Laravel routing involved for frontend assets
- React Router handles client-side routing

### API Handling
- Only `/api/*` requests go to Laravel
- All other requests serve the frontend directly
- No interference with other projects

### URL Structure
- **Frontend**: `http://10.2.10.178/crns/` → serves `public/frontend/index.html`
- **Assets**: `http://10.2.10.178/crns/assets/` → serves `public/frontend/assets/`
- **Laravel Assets**: `http://10.2.10.178/crns/build/` → serves `public/build/`
- **API**: `http://10.2.10.178/crns/api/*` → goes to Laravel

## Benefits
✅ **No conflicts** with other projects (MTCT, etc.)  
✅ **Simple configuration** - minimal .htaccess  
✅ **Fast serving** - frontend assets served directly  
✅ **Isolated** - CRNS only handles its own requests  
✅ **Correct asset paths** - no MIME type errors  

## Testing
After deployment:
1. ✅ CRNS works at `http://10.2.10.178/crns/`
2. ✅ MTCT system still works at `http://10.2.10.178/mtct-system/public/`
3. ✅ Other projects remain unaffected
4. ✅ No MIME type errors
5. ✅ JavaScript and CSS files load correctly

## Troubleshooting

### If assets don't load (MIME type errors):
1. **Check Apache configuration** - ensure `/crns/` is properly aliased to the CRNS public folder
2. **Verify build** - make sure `public/frontend/assets/` contains the built files
3. **Check .htaccess** - ensure it's being processed by Apache

### If API doesn't work:
1. Verify Laravel is running and database is configured
2. Check that `/crns/api/*` requests are reaching Laravel

### If other projects break:
1. Check Apache configuration - CRNS should only handle `/crns/` requests
2. Verify the Alias directive is correct
3. Ensure no global rewrite rules are interfering

## Important Notes
- **CRNS must be accessible at `/crns/`** - this is hardcoded in the build
- **Apache Alias is required** - the .htaccess alone won't work without proper Apache configuration
- **Assets are built with `/crns/` base path** - changing this requires rebuilding
