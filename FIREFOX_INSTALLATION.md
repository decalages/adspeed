# 🚀 Ad Speed - Firefox Extension Installation Guide

## Installation for Development

### Method 1: Temporary Installation (Development)

1. Open Firefox
2. Go to `about:debugging` in the address bar
3. Click on "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to the extension folder and select the `manifest.json` file
6. The extension will be loaded temporarily (until Firefox is restarted)

### Method 2: Web Extension Installation (Permanent)

1. Package the extension:
   ```bash
   npm run package
   ```
   This creates `ad-speed-extension-firefox.zip`

2. Go to `about:config` in Firefox
3. Search for `xpinstall.signatures.required` and set it to `false` (for unsigned extensions)
4. Go to `about:addons`
5. Click the gear icon and select "Install Add-on From File..."
6. Select the `ad-speed-extension-firefox.zip` file

## How to Use

1. After installation, you'll see the 🚀 Ad Speed icon in the Firefox toolbar
2. Navigate to any website with ads
3. The extension will automatically detect and measure ad loading times
4. Click the extension icon to view:
   - Current page ad load time
   - History of all measurements
   - Average loading times

## Features

- **Real-time Ad Detection**: Monitors fastlane.json, Google Ads, and Amazon Ads requests
- **SPA Support**: Tracks ad loading times for Single Page Applications
- **Visual Notifications**: Shows in-page notifications when ads are detected
- **Performance History**: Keeps track of the last 100 measurements
- **Cross-browser Compatible**: Works on both Chrome and Firefox

## Permissions Explained

- `webRequest`: Monitor network requests to detect ad server calls
- `webNavigation`: Track page navigation and SPA route changes
- `storage`: Store measurement history
- `tabs`: Access current tab information
- `<all_urls>`: Monitor all websites for ad detection

## Troubleshooting

### Extension Not Working
- Make sure Firefox allows unsigned extensions (`xpinstall.signatures.required = false`)
- Check that all permissions are granted
- Reload the extension if it was temporarily installed

### No Ads Detected
- The extension only detects specific ad networks (Google Ads, Amazon Ads, Fastlane)
- Some ad blockers might prevent detection
- Try visiting a site known to have ads (news websites, blogs)

### Performance Issues
- The extension is designed to have minimal performance impact
- History is limited to 100 measurements to prevent memory issues
- Clear history if needed using the "Clear" button in the popup

## Development

To modify the extension:

1. Make changes to the source files
2. Reload the extension in `about:debugging`
3. Test the changes

The extension uses the WebExtensions API and is compatible with both Firefox and Chrome browsers.
