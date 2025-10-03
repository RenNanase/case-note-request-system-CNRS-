# CNRS Development Workflow Guide

## 🎯 Problem Solved
**No more manual asset hash updates!** This guide shows you how to develop and deploy automatically without manually editing Blade template asset paths.

## 🚀 Automated Build Solutions

### Option 1: JavaScript Build Script (Recommended)
```bash
# One command for everything!
node build-production.js
```

### Option 2: PHP Build Script
```bash
# Pure PHP solution
php build-production.php
```

### Option 3: Bash Build Script
```bash
# Make executable first
chmod +x build.sh

# Then run
./build.sh
```

## 📋 What Each Script Does Automatically

✅ **Builds Frontend**: Runs `npm run build` in frontend directory  
✅ **Reads Manifest**: Gets latest asset hashes from `public/frontend/.vite/manifest.json`  
✅ **Updates Blade**: Automatically injects correct asset paths into `resources/views/app.blade.php`  
✅ **Clears Caches**: Runs Laravel cache clearing commands  
✅ **Provides Summary**: Shows what was built and updated  

## 🔄 Your New Development Workflow

### 1. Develop Your Features
```bash
# Make your changes in:
# - frontend/src/pages/
# - frontend/src/components/
# - app/Http/Controllers/
# - resources/views/
```

### 2. Build & Deploy Automatically
```bash
# Choose one of these:
node build-production.js    # JavaScript version
php build-production.php    # PHP version
./build.sh                  # Bash version
```

### 3. Test Your Changes
```bash
# Visit your deployment
http://10.2.10.178/CNRS/public/login
```

## 🛠️ What Gets Updated Automatically

**Before (Manual Process):**
```html
<!-- You had to manually edit this every time -->
<script src="/CNRS/public/frontend/assets/index-OLD123.js"></script>
<link href="/CNRS/public/frontend/assets/index-OLD456.css">
```

**After (Automatic Process):**
```html
<!-- Generated automatically from manifest -->
<script src="/CNRS/public/frontend/assets/index-BRlAQoP4-1759126169763.js"></script>
<link href="/CNRS/public/frontend/assets/index-C_rmNB6m-1759126169962.css">
```

## 📁 Files You Should NEVER Edit Manually Anymore

- ❌ `resources/views/app.blade.php` (asset section only)
- ❌ Asset hash references

## 📁 Files You CAN Edit Freely

- ✅ `frontend/src/**/*` (All React components and pages)
- ✅ `app/Http/Controllers/**/*` (Laravel controllers)
- ✅ `resources/views/**/*` (Except asset section in app.blade.php)
- ✅ `routes/**/*` (Laravel routes)
- ✅ Any other application files!

## 🔥 Pro Tips

### Tip 1: Use npm Script Shortcut
```bash
# Add to new package.json, then use:
npm run build-production
npm run build
```

### Tip 2: Watch Mode During Development
```bash
# For active development, start the dev server
cd frontend && npm run dev

# Then access via: http://localhost:5173
# This watches files and auto-reloads!
```

### Tip 3: Production Deployment Only
```bash
# Only use the build scripts for production deployment
node build-production.js  # For intranet deployment
```

## 🚨 Troubleshooting

### Build Script Fails?
```bash
# Check if Node.js/PHP is available
node --version
php --version

# Check if frontend dependencies are installed
cd frontend && npm install
```

### Assets Still Not Loading?
```bash
# Manually clear Laravel caches
php artisan view:clear
php artisan cache:clear
php artisan route:clear

# Check file permissions
ls -la public/frontend/assets/
```

### Blade Template Gets Corrupted?
```bash
# Restore from backup (created by build script)
cp resources/views/app.blade.php.backup resources/views/app.blade.php
```

## 🎉 Benefits

🔹 **Zero Manual Work**: Asset paths update automatically  
🔹 **No Typos**: Scripts ensure correct paths  
🔹 **Fast Deployment**: One command does everything  
🔹 **Version Safety**: Always uses latest built assets  
🔹 **Multiple Options**: Choose your preferred scripting language  

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `node build-production.js` | Build & deploy (JavaScript) |
| `php build-production.php` | Build & deploy (PHP) |
| `./build.sh` | Build & deploy (Bash) |
| `cd frontend && npm run dev` | Development mode |
| `cd frontend && npm run build` | Frontend only build |

---
**Happy coding!** 🚀 You now have a seamless development-to-production workflow!
