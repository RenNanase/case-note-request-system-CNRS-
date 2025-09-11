# 🔧 Troubleshooting 500 Internal Server Error

## 🚨 Immediate Issue
You're getting a 500 Internal Server Error, which means there's a server configuration problem preventing your site from working.

## 🔍 Root Cause Analysis
The 500 error is likely caused by:
1. **Apache configuration syntax errors** in `.htaccess` files
2. **Missing Apache modules** (mod_headers, mod_expires)
3. **Incorrect file paths** in Apache configuration
4. **Permission issues** with `.htaccess` files

## 🛠️ Step-by-Step Solution

### Step 1: Test Basic Functionality
1. **Access the simple test page**: Navigate to `/crns/test-simple.html`
2. **If this works**: The basic server is functioning
3. **If this fails**: There's a fundamental server configuration issue

### Step 2: Check Apache Error Logs
1. **Open Laragon** and check the Apache error logs
2. **Look for specific error messages** that explain the 500 error
3. **Common errors**:
   - `mod_headers not available`
   - `mod_expires not available`
   - `Invalid .htaccess syntax`

### Step 3: Temporarily Remove .htaccess Files
If you're still getting 500 errors:

1. **Rename the .htaccess files** to test:
   ```bash
   public/.htaccess → public/.htaccess.bak
   public/frontend/.htaccess → public/frontend/.htaccess.bak
   public/frontend/assets/.htaccess → public/frontend/assets/.htaccess.bak
   ```

2. **Test if the site loads** without .htaccess files
3. **If it works**: The issue is in the .htaccess configuration
4. **If it still fails**: The issue is in Apache configuration

### Step 4: Check Apache Configuration
1. **Verify the Apache config path** in `apache-config.conf`:
   ```apache
   Alias /crns "C:/laragon/www/crns/public"
   ```

2. **Ensure this configuration is loaded** by Laragon
3. **Check if Laragon is using** the correct Apache configuration file

### Step 5: Restart Apache
1. **Stop Apache** in Laragon
2. **Wait 5 seconds**
3. **Start Apache** again
4. **Test the site**

### Step 6: Test MIME Types
1. **Access the diagnostic page**: `/crns/apache-info.php`
2. **Check the results** to see what's working and what's not
3. **Look for MIME type information** in the response headers

## 🔧 Alternative Solutions

### Option 1: Minimal .htaccess (Recommended)
If the complex .htaccess files cause issues, use this minimal version:

**public/frontend/.htaccess**:
```apache
# Minimal MIME type configuration
<IfModule mod_mime.c>
    AddType application/javascript .js
    AddType text/css .css
</IfModule>
```

### Option 2: Apache Configuration Only
Remove all `.htaccess` files and handle MIME types in Apache configuration:

**apache-config.conf**:
```apache
Alias /crns "C:/laragon/www/crns/public"

<Directory "C:/laragon/www/crns/public">
    Options Indexes FollowSymLinks MultiViews
    AllowOverride None
    Require all granted

    <IfModule mod_mime.c>
        AddType application/javascript .js
        AddType text/css .css
    </IfModule>
</Directory>
```

### Option 3: PHP-Based MIME Type Handling
If Apache configuration isn't working, handle MIME types in PHP:

**public/frontend/assets/index.php**:
```php
<?php
$file = $_GET['file'] ?? '';
$ext = pathinfo($file, PATHINFO_EXTENSION);

switch($ext) {
    case 'js':
        header('Content-Type: application/javascript');
        break;
    case 'css':
        header('Content-Type: text/css');
        break;
    default:
        header('Content-Type: text/plain');
}

readfile(__DIR__ . '/' . $file);
?>
```

## 🧪 Testing Steps

### Test 1: Basic Access
- [ ] `/crns/test-simple.html` loads without errors
- [ ] `/crns/apache-info.php` loads without errors

### Test 2: Asset Access
- [ ] `/crns/frontend/assets/index-CPfXTIc0.js` loads with `application/javascript` MIME type
- [ ] `/crns/frontend/assets/index-ARMcF9ci.css` loads with `text/css` MIME type

### Test 3: Frontend Application
- [ ] `/crns/frontend/` loads the React application
- [ ] No MIME type errors in browser console

## 🚨 Emergency Recovery

If nothing works:

1. **Remove all .htaccess files**
2. **Use default Apache MIME types**
3. **Test basic file access**
4. **Gradually add configuration back**

## 📞 Getting Help

If you're still having issues:

1. **Check Laragon Apache error logs**
2. **Verify Apache configuration syntax**
3. **Test with minimal configuration**
4. **Check file permissions**

## 🎯 Expected Outcome

After following these steps, you should have:
- ✅ No more 500 Internal Server Errors
- ✅ JavaScript files served with `application/javascript` MIME type
- ✅ CSS files served with `text/css` MIME type
- ✅ Working React application without MIME type errors
