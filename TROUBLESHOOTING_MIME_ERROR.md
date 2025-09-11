# Troubleshooting MIME Type Error

## The Problem
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html". Strict MIME type checking is enforced for module scripts per HTML spec.
```

## What This Means
The browser is trying to load a JavaScript file, but the server is responding with HTML content instead. This happens when:
1. The file path is wrong
2. The server is not configured to serve files from the correct directory
3. The .htaccess file is not working
4. Apache configuration is missing

## Step-by-Step Solution

### Step 1: Test Current Setup
1. Copy `test-assets.html` to your `public/frontend/` directory
2. Access it at: `http://10.2.10.178/crns/frontend/test-assets.html`
3. This will show you exactly what's working and what's not

### Step 2: Check Apache Configuration
**This is the most important step!** You need to add this to your Apache configuration:

```apache
# Add to your Apache configuration (httpd.conf or virtual host)
Alias /crns /path/to/your/server/crns/public

<Directory "/path/to/your/server/crns/public">
    Options Indexes FollowSymLinks MultiViews
    AllowOverride All
    Require all granted
</Directory>
```

**Replace `/path/to/your/server/crns/public` with the actual path to your CRNS public folder.**

### Step 3: Restart Apache
After adding the configuration:
```bash
# On Linux/Mac
sudo systemctl restart apache2
# or
sudo service apache2 restart

# On Windows
# Restart Apache service from Services
```

### Step 4: Test Direct File Access
Try accessing these URLs directly in your browser:
- `http://10.2.10.178/crns/frontend/assets/index-CPfXTIc0.js`
- `http://10.2.10.178/crns/frontend/assets/index-ARMcF9ci.css`

**Expected Result**: You should see the actual file content, not HTML.

**If you see HTML**: The Apache Alias is not configured correctly.

### Step 5: Check File Permissions
Ensure the web server can read your files:
```bash
# On Linux/Mac
chmod -R 755 public/
chown -R www-data:www-data public/  # or your web server user
```

### Step 6: Verify .htaccess is Working
Check if Apache is processing your .htaccess file:
1. Add this line to your .htaccess:
   ```apache
   # Test line - remove after testing
   ErrorDocument 404 "htaccess is working"
   ```
2. Try accessing a non-existent file: `http://10.2.10.178/crns/nonexistent`
3. If you see "htaccess is working", .htaccess is working
4. If you see a default 404 page, .htaccess is not being processed

### Step 7: Check Apache Error Logs
Look at Apache error logs for clues:
```bash
# On Linux/Mac
sudo tail -f /var/log/apache2/error.log

# On Windows
# Check Apache error logs in your Apache installation directory
```

## Common Issues and Solutions

### Issue 1: "File not found" errors
**Cause**: Apache Alias path is incorrect
**Solution**: Double-check the path in your Apache configuration

### Issue 2: Still getting HTML instead of JavaScript
**Cause**: Apache is not configured to serve files from the CRNS directory
**Solution**: Ensure the Alias directive is correct and Apache is restarted

### Issue 3: .htaccess not working
**Cause**: Apache doesn't have AllowOverride All
**Solution**: Add `AllowOverride All` to your Directory configuration

### Issue 4: Other projects breaking
**Cause**: Global rewrite rules interfering
**Solution**: Ensure your CRNS configuration is specific to `/crns/` only

## Quick Test Commands

### Test if files exist:
```bash
ls -la public/frontend/assets/
ls -la public/frontend/
```

### Test if Apache can read files:
```bash
# On Linux/Mac
sudo -u www-data cat public/frontend/assets/index-CPfXTIc0.js | head -5
```

### Test Apache configuration:
```bash
# On Linux/Mac
sudo apache2ctl -t
sudo apache2ctl -S
```

## Final Verification

After completing all steps:

1. ✅ CRNS loads at `http://10.2.10.178/crns/`
2. ✅ JavaScript files load with `application/javascript` MIME type
3. ✅ CSS files load with `text/css` MIME type
4. ✅ MTCT system still works at `http://10.2.10.178/mtct-system/public/`
5. ✅ Other projects remain unaffected

## If Still Not Working

1. **Check the test page**: `http://10.2.10.178/crns/frontend/test-assets.html`
2. **Verify Apache configuration**: Ensure Alias directive is correct
3. **Check file permissions**: Web server must be able to read files
4. **Restart Apache**: Configuration changes require restart
5. **Check error logs**: Apache logs will show what's happening

The key is the Apache Alias configuration - without it, the .htaccess file alone cannot solve the MIME type issue.
