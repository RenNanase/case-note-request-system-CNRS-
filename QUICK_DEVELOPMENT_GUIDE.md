# 🚀 CNRS Quick Development Guide

## 🎯 Development-to-Production Workflow

**Before:** Manually edit asset paths every time → 😤  
**Now:** One command does everything → 😍

## 📋 Your New Workflow

### 1. Develop Your Features
```bash
# Edit your React components
frontend/src/pages/YourPage.tsx
frontend/src/components/YourComponent.tsx

# Edit your Laravel code
app/Http/Controllers/YourController.php
resources/views/your-view.blade.php
```

### 2. Build & Deploy Automatically
```bash
# Choose one option:
php build-production.php    # ✅ Recommended - Pure PHP
node build-production.js    # Alternative - Requires Node.js
./build.sh               # Alternative - Requires Bash
```

### 3. Done! 🎉
Your changes are live at: `http://10.2.10.178/CNRS/public/login`

## 🔄 What Gets Updated Automatically

✅ **Frontend Assets**: Builds latest React code  
✅ **Asset Paths**: Updates Blade template with correct hashes  
✅ **Laravel Caches**: Clears view/cache/route caches  
✅ **Manifest Reading**: Gets latest asset filenames from Vite  

## 📁 Files You Control

### 🟢 Edit Freely
- `frontend/src/**/*.tsx` (All React components/pages)
- `app/Http/**/*.php` (Laravel controllers)
- `resources/views/**/*.blade.php` (Blade templates)
- `routes/**/*.php` (Laravel routes)

### 🔴 DON'T Edit Manually
- `resources/views/app.blade.php` (asset section only)
- Asset hash references

## 💡 Pro Tips

### Tip 1: Development Mode
```bash
cd frontend && npm run dev
# Then use: http://localhost:5173 for hot-reload development
```

### Tip 2: Production Mode
```bash
php build-production.php
# Then use: http://10.2.10.178/CNRS/public/login for production testing
```

### Tip 3: Quick Check
```bash
# After running build script, verify the changes:
cat resources/views/app.blade.php | grep -A 3 "Vite Assets"
```

## 🚨 Troubleshooting

### Build Fails?
```bash
# Check dependencies
cd frontend && npm install

# Clear npm cache
cd frontend && npm cache clean --force
```

### Assets Not Loading?
```bash
# Manually clear Laravel caches
php artisan view:clear
php artisan cache:clear
php artisan route:clear
```

### Script Permission Issue?
```bash
# For bash script
chmod +x build.sh
```

## 📊 Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `php build-production.php` | 🏗️ Build & deploy everything |
| `cd frontend && npm run dev` | 🔥 Development mode |
| `cd frontend && npm run build` | 📦 Frontend only |
| `php artisan cache:clear` | 🧹 Clear Laravel cache |

## 🎉 Benefits

- 🔹 **Zero Manual Work**: Asset paths update automatically
- 🔹 **No Typos**: Scripts ensure correct paths every time
- 🔹 **Quick Deployment**: One command → Live on network
- 🔹 **Consistent Builds**: Always uses latest built assets
- 🔹 **Multiple Options**: Choose your preferred scripting language

---

**🎯 Bottom Line:** Run `php build-production.php` after making changes, and you're done! 

No more manual asset hash editing! 🚀
