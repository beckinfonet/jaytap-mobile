# Universal Links Setup Instructions

## Part 1: Configure Associated Domains in Xcode

### Step 1: Open Xcode Project
1. Open `JayTap.xcworkspace` (not `.xcodeproj`) in Xcode
2. Select the **JayTap** project in the left sidebar
3. Select the **JayTap** target

### Step 2: Enable Associated Domains
1. Click on the **"Signing & Capabilities"** tab at the top
2. Click the **"+ Capability"** button
3. Search for and add **"Associated Domains"**
4. In the Associated Domains section, click the **"+"** button
5. Add: `applinks:www.bizdinkonush.com`
   - **Important**: Use `applinks:` prefix (not `https://`)
   - The format is: `applinks:yourdomain.com`

### Step 3: Verify Bundle Identifier
- Make sure your Bundle Identifier matches what you'll use in the apple-app-site-association file
- You can find it in the "General" tab under "Bundle Identifier"
- Format: `com.yourcompany.JayTap` or similar

---

## Part 2: Create and Serve apple-app-site-association File

### Step 1: Create the File
Create a file named `apple-app-site-association` (no extension) with this content:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.BUNDLE_IDENTIFIER",
        "paths": [
          "/property/*"
        ]
      }
    ]
  }
}
```

**Replace:**
- `TEAM_ID` with your Apple Developer Team ID (found in Apple Developer account)
- `BUNDLE_IDENTIFIER` with your app's bundle identifier (e.g., `com.yourcompany.JayTap`)

**Example:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "ABC123XYZ.com.yourcompany.JayTap",
        "paths": [
          "/property/*"
        ]
      }
    ]
  }
}
```

### Step 2: Upload to Web Server
1. Upload the file to your web server at this exact path:
   ```
   https://www.bizdinkonush.com/.well-known/apple-app-site-association
   ```

2. **Important Requirements:**
   - File must be accessible via HTTPS (not HTTP)
   - File must be served with `Content-Type: application/json`
   - File must be publicly accessible (no authentication)
   - File must be at the root domain (not a subdomain)

### Step 3: Configure Server Headers
Make sure your web server serves the file with the correct content type:

**For Apache (.htaccess):**
```apache
<Files "apple-app-site-association">
    Header set Content-Type "application/json"
</Files>
```

**For Nginx:**
```nginx
location /.well-known/apple-app-site-association {
    default_type application/json;
    add_header Content-Type application/json;
}
```

**For Node.js/Express:**
```javascript
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'apple-app-site-association'));
});
```

### Step 4: Verify the File
1. Open a browser and visit: `https://www.bizdinkonush.com/.well-known/apple-app-site-association`
2. You should see the JSON content
3. Check that the Content-Type header is `application/json` (use browser DevTools)

### Step 5: Test Universal Links
1. **On iOS Device:**
   - Long-press a shared link in Messages/Notes
   - You should see "Open in JayTap" option
   - If not, the association might need time to propagate (can take up to 24 hours)

2. **Validation Tool:**
   - Use Apple's validator: https://search.developer.apple.com/appsearch-validation-tool/
   - Enter your domain and verify the file is correctly configured

---

## Troubleshooting

### Links Not Opening in App
1. **Check Team ID**: Make sure the Team ID in the file matches your Apple Developer account
2. **Check Bundle ID**: Verify it matches your app's Bundle Identifier exactly
3. **File Accessibility**: Ensure the file is publicly accessible (test in incognito mode)
4. **HTTPS Required**: The file must be served over HTTPS
5. **Wait Time**: Apple caches the association file - changes can take up to 24 hours

### Testing Tips
- Delete and reinstall the app after making changes
- Test on a real device (not simulator) for universal links
- Check Xcode console for deep link logs

---

## Quick Checklist

- [ ] Added Associated Domains capability in Xcode
- [ ] Added `applinks:www.bizdinkonush.com` domain
- [ ] Created `apple-app-site-association` file with correct Team ID and Bundle ID
- [ ] Uploaded file to `/.well-known/` directory on web server
- [ ] File is accessible via HTTPS
- [ ] File is served with `Content-Type: application/json`
- [ ] Tested file accessibility in browser
- [ ] Verified with Apple's validation tool


