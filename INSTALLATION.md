# 🚀 Installation Guide - Ad Speed Extension

## Step-by-step installation

### 1. Preparation
```bash
# Check that all files are present
ls -la
# You should see:
# - manifest.json
# - background.js  
# - content.js
# - popup.html, popup.css, popup.js
# - icons/ (with icon16.png, icon48.png, icon128.png)
```

### 2. Installation in Chrome

1. **Open Chrome** and go to: `chrome://extensions/`

2. **Enable developer mode**:
   - Click the "Developer mode" button in the top right
   - The button becomes blue when enabled

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `adspeed` folder (this folder)
   - The extension appears in the list

4. **Verification**:
   - The "Ad Speed" icon should appear in the Chrome toolbar (next to the address bar)
   - If it's not visible, click the puzzle icon 🧩 and pin "Ad Speed"

### 3. Testing the extension

#### Automatic test
1. Open `test.html` in Chrome
2. Follow the instructions on the page
3. Click "Simulate a fastlane.json call"
4. Verify that the extension detects the simulation

#### Test on a real site
1. Visit a site with Google ads (e.g., news sites)
2. Open DevTools (F12) → Network tab
3. Search for "fastlane.json" in the requests
4. If you find one, the extension should detect it automatically

### 4. Usage

#### Popup interface
- **Click the Ad Speed icon** to see:
  - Current page status
  - Measurement history
  - Statistics (average time, total count)

#### Notifications
- A notification appears automatically when an ad is detected
- Shows loading time in milliseconds

#### Developer API
```javascript
// In a web page console:
window.AdSpeed.getLastMeasurement().then(console.log);

// Listen for events:
window.addEventListener('adSpeedDetected', (event) => {
  console.log('Ad detected:', event.detail);
});
```

## 🔧 Troubleshooting

### The extension doesn't load
- Check that the folder contains `manifest.json`
- Reload the extension from `chrome://extensions/`
- Check the error console in `chrome://extensions/`

### No measurements detected
- Visit sites with Google Ads
- Open DevTools → Network and search for "fastlane"
- Some sites use ad blockers or other systems

### The popup doesn't open
- Click directly on the Ad Speed icon
- If the icon isn't visible, click 🧩 and pin the extension

### Missing data
- History is stored locally in Chrome
- Use "Clear" in the popup to reset
- Data is lost if you uninstall the extension

## 📊 Operation validation

### Good operation indicators:
✅ Extension visible in `chrome://extensions/`  
✅ Ad Speed icon in toolbar  
✅ Popup opens when clicking the icon  
✅ Simulation test works in `test.html`  
✅ `window.AdSpeed` API available in pages  
✅ Notifications appear upon detection  

### Recommended test sites:
- News sites (Le Monde, Le Figaro)
- Commerce sites (Amazon, eBay) 
- Blogs with ads
- YouTube (sometimes)

## 🎯 Next steps

Once the extension is installed and tested:

1. **Data collection**: Browse normally, the extension collects automatically
2. **Analysis**: Regularly check the popup to see trends
3. **Optimization**: Identify sites with long ad loading times
4. **Sharing**: Export data for analysis (feature to add if needed)

## 🔄 Updates

To update the extension:
1. Modify files in this folder
2. Go to `chrome://extensions/`
3. Click the ↻ (Refresh) icon on the Ad Speed card
4. Changes are immediately active

---

**🎉 The Ad Speed extension is now ready to measure ad performance!**
