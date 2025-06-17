# 🚀 Ad Speed - Chrome Extension

A Chrome extension that measures the initial response time from ad servers to help optimize ad performance. This extension specifically tracks the first network request to ad servers (not the complete ad rendering time) to provide insights into ad server latency and connection speeds. Perfect for publishers, advertisers, and web developers who need to monitor ad delivery performance and identify potential bottlenecks in their ad serving infrastructure.

## 🚀 Features

- **🚀 Enhanced automatic detection**: Automatically detects multiple types of ads
  - ⚡ **Fastlane**: URLs containing `fastlane.json`
  - 📢 **Google Ads**: URLs containing `gampad/ads`
- **🚀 Precise measurement**: Calculates time between page initialization and ad detection
- **🚀 Visual notifications**: Shows detected ad type with differentiated icons
- **📊 Detailed history**: Keeps a history of the last 100 measurements with ad type
- **📈 Statistics**: Calculates average ad loading times
- **🎨 Modern interface**: Popup with modern and responsive design with rocket theme

## 📦 Installation

### Method 1: Developer mode installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked extension"
5. Select the `adspeed` folder
6. The extension is now installed!

### Method 2: Package the extension

```bash
# Create a ZIP package for distribution
zip -r ad-speed-extension.zip . -x "*.git*" "README.md" "*.DS_Store"
```

## 🔧 Usage

1. **Normal browsing**: The extension works automatically in the background
2. **Click the icon**: Open the popup to see current measurements and history
3. **Notifications**: A notification appears automatically when an ad is detected
4. **Developer API**: Access data via `window.AdSpeed.getLastMeasurement()`

## 🎯 Technical Operation

### Ad Detection

The extension uses multiple mechanisms to detect different types of ads:

1. **WebRequest API**: Intercepts all HTTP/HTTPS requests
2. **Enhanced pattern matching**: Searches for multiple patterns: Fastlane, Goggle Ads and Amazon ads
3. **Precise timing**: Measures time from `webNavigation.onBeforeNavigate`
4. **Automatic classification**: Differentiates FastLane (⚡) from other ads (📢)

### Architecture

```
├── manifest.json          # Extension configuration
├── background.js          # Service worker (main logic)
├── content.js            # Script injected into pages
├── popup.html            # User interface
├── popup.css             # Popup styles
├── popup.js              # Popup logic
└── icons/                # Extension icons
```

### Required permissions

- `webRequest`: Network request interception
- `webNavigation`: Page navigation monitoring
- `storage`: History storage
- `tabs`: Access to browser tabs
- `<all_urls>`: Monitoring all sites

## 🎯 Use cases

### For web developers
```javascript
// Listen for ad detection events
window.addEventListener('adSpeedDetected', (event) => {
  console.log('Ad loaded in:', event.detail.adLoadTime, 'ms');
  console.log('Fastlane URL:', event.detail.fastlaneUrl);
});

// Get the last measurement
window.AdSpeed.getLastMeasurement().then(data => {
  if (data) {
    console.log('Loading time:', data.adLoadTime, 'ms');
  }
});
```

### For performance analysts
- Monitor ad performance across different sites
- Identify sites with long ad loading times
- Analyze performance trends over time

## 📈 Data collected

The extension collects and stores locally:

- **Page URL**: Visited website
- **Loading time**: Milliseconds between navigation and fastlane.json
- **Fastlane URL**: Complete URL of the fastlane.json request
- **Timestamp**: Date and time of measurement
- **History**: Last 100 measurements (local storage only)

## 🔒 Privacy

- **Local storage only**: No data is sent to external servers
- **No tracking**: The extension does not track users
- **Temporary data**: History is limited to the last 100 measurements
- **User control**: Ability to clear history at any time

## 🛠️ Development

### Prerequisites
- Chrome/Chromium
- Code editor (VS Code recommended)

### Code structure

#### background.js
- Main service worker
- WebRequest and Navigation event management
- Performance data storage

#### content.js
- Script injected into web pages
- Notification display
- Developer API

#### popup.html/js/css
- Extension user interface
- Measurement and history display
- User interaction management

### Testing

To test the extension:

1. Visit sites using Google Ads or Fastlane
2. Open DevTools (F12) → Network tab
3. Search for requests containing "fastlane.json"
4. Verify that the extension detects and measures correctly

### Debug

```javascript
// In DevTools console of a page
window.AdSpeed.getLastMeasurement().then(console.log);

// Listen for events
window.addEventListener('adSpeedDetected', console.log);
```

## 🐛 Troubleshooting

### The extension doesn't detect ads
- Check that the site uses Google Ads or a similar system
- Open DevTools and look at the Network tab for "fastlane.json"
- Reload the page completely

### The popup doesn't open
- Check that the extension is enabled in chrome://extensions/
- Restart Chrome if necessary

### Missing data
- History is stored locally and may be lost upon uninstallation
- Use the "Clear" button to reset if necessary

## 📝 Technical notes

- **Manifest V3**: Uses the latest version of Chrome Extensions API
- **Service Worker**: Replaces background pages for better performance
- **Minimal permissions**: Only requests necessary permissions
- **Optimized performance**: Uses Map() for fast data access

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

This project is under MIT license. See the LICENSE file for more details.

## 🔄 Versions

- **v1.0.0**: Initial version with fastlane.json detection and user interface
