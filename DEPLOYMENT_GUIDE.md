# Laravel + React Deployment Guide

## Overview
This guide explains how to properly deploy a Laravel backend with React frontend on the same server, specifically addressing the network deployment issues.

## Current Setup
- **Laravel Backend**: Served from `/crns/public/`
- **React Frontend**: Built and served from `/crns/public/frontend/`
- **Base URL**: `
/`

## Configuration Files

### 1. Vite Configuration (`frontend/vite.config.ts`)
```typescript
export default defineConfig({
  base: '/crns/public/frontend/', // Correct base path for subdirectory
  // ... other config
})
```

### 2. Laravel Routes (`routes/web.php`)
```php
// API status route
Route::get('/', function () {
    return response()->json([
        'message' => 'CRNS API Server',
        'status' => 'running'
    ]);
});

// Frontend route - serve the React app
Route::get('/frontend{any?}', function () {
    return response()->file(public_path('frontend/index.html'));
})->where('any', '.*');

// Catch-all route for frontend
Route::get('/{any?}', function () {
    if (str_starts_with(request()->path(), 'api')) {
        abort(404);
    }
    return response()->file(public_path('frontend/index.html'));
})->where('any', '.*');
```

### 3. Apache .htaccess (`public/.htaccess`)
```apache
RewriteEngine On
RewriteBase /crns/public/

# Handle Front Controller
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [L]
```

### 4. Frontend .htaccess (`public/frontend/.htaccess`)
```apache
RewriteEngine On

# Handle React Router - redirect all non-asset requests to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]
```

## Deployment Steps

### Step 1: Build React Frontend
```bash
cd frontend
npm run build
```

### Step 2: Copy Built Files
```bash
# Copy built files to Laravel public directory
xcopy /E /I /Y dist\* ..\public\frontend\
```

### Step 3: Verify File Structure
```
public/
├── .htaccess
├── index.php
├── frontend/
│   ├── index.html
│   ├── .htaccess
│   ├── assets/
│   │   ├── index-*.js
│   │   └── index-*.css
│   └── cnrs.logo.png
└── ...
```

## Access URLs

### Backend API
- **API Status**: `http://10.2.10.178/crns/public/`
- **API Routes**: `http://10.2.10.178/crns/public/api/*`

### Frontend
- **Main App**: `http://10.2.10.178/crns/public/`
- **Frontend Assets**: `http://10.2.10.178/crns/public/frontend/*`

## Troubleshooting

### 404 Not Found Errors
1. **Check .htaccess**: Ensure `RewriteBase /crns/public/` is set correctly
2. **Verify Routes**: Ensure Laravel routes are properly configured
3. **Asset Paths**: Verify React build has correct base path

### Asset Loading Issues
1. **Rebuild Frontend**: Run `npm run build` after changing vite.config.ts
2. **Copy Files**: Ensure built files are copied to `public/frontend/`
3. **Check Paths**: Verify asset paths in built index.html

### Network Access Issues
1. **Firewall**: Ensure port 80/443 is open
2. **Apache Config**: Check Apache virtual host configuration
3. **Permissions**: Verify file permissions on public directory

## Server Configuration

### Apache Virtual Host (Recommended)
```apache
<VirtualHost *:80>
    ServerName 10.2.10.178
    DocumentRoot /path/to/CNRS/public
    
    <Directory /path/to/CNRS/public>
        AllowOverride All
        Require all granted
    </Directory>
    
    # Handle Laravel routing
    RewriteEngine On
    RewriteBase /
    
    # API routes
    RewriteRule ^api/(.*)$ index.php [L]
    
    # Frontend routes
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [L]
</VirtualHost>
```

### Nginx Configuration (Alternative)
```nginx
server {
    listen 80;
    server_name 10.2.10.178;
    root /path/to/CNRS/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Environment Variables

### Laravel (.env)
```env
APP_URL=http://10.2.10.178/crns/public
APP_ENV=production
APP_DEBUG=false
```

### React (.env.production)
```env
VITE_API_BASE_URL=http://10.2.10.178/crns/public/api
```

## Security Considerations

1. **HTTPS**: Use SSL certificates for production
2. **CORS**: Configure CORS properly for API access
3. **Authentication**: Implement proper authentication middleware
4. **File Permissions**: Set appropriate file permissions
5. **Environment**: Use production environment settings

## Performance Optimization

1. **Asset Compression**: Enable gzip compression
2. **Caching**: Implement proper caching headers
3. **CDN**: Consider using CDN for static assets
4. **Database**: Optimize database queries and indexing
5. **Queue**: Use Laravel queues for background jobs

## Monitoring

1. **Logs**: Monitor Laravel and Apache/Nginx logs
2. **Performance**: Use tools like New Relic or Laravel Telescope
3. **Uptime**: Implement uptime monitoring
4. **Errors**: Set up error tracking (Sentry, Bugsnag)
