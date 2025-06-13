// Service worker for Ad Speed extension
let pageLoadTimes = new Map();
let fastlaneDetected = new Map();
let spaNavigationTimes = new Map(); // To track SPA navigations

// Listen for navigation events (complete reloads)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Only for main frame
    const currentTime = Date.now();
    pageLoadTimes.set(details.tabId, {
      startTime: currentTime,
      url: details.url,
      fastlaneTime: null,
      adLoadTime: null,
      isReload: true // Indicates a complete reload
    });
    fastlaneDetected.set(details.tabId, false);
    
    // Reset SPA tracking
    spaNavigationTimes.delete(details.tabId);
  }
});

// Listen for history changes (SPA navigations)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) { // Only for main frame
    const currentTime = Date.now();
    const tabId = details.tabId;
    
    // Store SPA navigation time
    spaNavigationTimes.set(tabId, {
      startTime: currentTime,
      url: details.url,
      fastlaneTime: null,
      adLoadTime: null,
      isReload: false // Indicates SPA navigation
    });
    
    // Reset ad detection for this new SPA "page"
    fastlaneDetected.set(tabId, false);
    
    // Also update pageLoadTimes for compatibility
    const existingData = pageLoadTimes.get(tabId);
    if (existingData) {
      pageLoadTimes.set(tabId, {
        ...existingData,
        spaStartTime: currentTime,
        spaUrl: details.url,
        isReload: false
      });
    } else {
      // Create new entry if it doesn't exist
      pageLoadTimes.set(tabId, {
        startTime: currentTime,
        url: details.url,
        fastlaneTime: null,
        adLoadTime: null,
        isReload: false
      });
    }
  }
});

// Listen for completed navigations to ensure content script is ready
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    const tabId = details.tabId;
    const pageData = pageLoadTimes.get(tabId);
    
    if (pageData) {
      // Mark that page is completely loaded
      pageData.pageCompleted = true;
      pageLoadTimes.set(tabId, pageData);
    }
  }
});

// Listen for web requests to detect ads (fastlane.json or /ads)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const tabId = details.tabId;
    if (tabId === -1) return; // Ignore requests without tabId
    
    // Detect advertising URLs
    const isAdRequest = details.url.includes('fastlane.json') || 
                       details.url.includes('gampad/ads') 
    
    if (isAdRequest) {
      const pageData = pageLoadTimes.get(tabId);
      const spaData = spaNavigationTimes.get(tabId);
      
      // Use SPA data if available and more recent, otherwise page data
      let relevantData = pageData;
      let startTime = pageData?.startTime || Date.now();
      let sourceUrl = pageData?.url || '';
      let navigationType = 'page-load';
      
      // If we have more recent SPA data, use it
      if (spaData && pageData) {
        if (spaData.startTime > pageData.startTime) {
          relevantData = spaData;
          startTime = spaData.startTime;
          sourceUrl = spaData.url;
          navigationType = 'spa-navigation';
        } else if (pageData.spaStartTime && pageData.spaStartTime > pageData.startTime) {
          startTime = pageData.spaStartTime;
          sourceUrl = pageData.spaUrl || pageData.url;
          navigationType = 'spa-navigation';
        }
      }
      
      if (relevantData && !fastlaneDetected.get(tabId)) {
        const currentTime = Date.now();
        const adLoadTime = currentTime - startTime;
        
        // Update data
        const updatedData = {
          ...relevantData,
          fastlaneTime: currentTime,
          adLoadTime: adLoadTime,
          adType: details.url.includes('fastlane.json') ? 'Fastlane' : 'Google Ads',
          navigationType: navigationType,
          detectionUrl: sourceUrl
        };
        
        pageLoadTimes.set(tabId, updatedData);
        if (spaData) {
          spaNavigationTimes.set(tabId, updatedData);
        }
        fastlaneDetected.set(tabId, true);
        
        // Send data to content script
        chrome.tabs.sendMessage(tabId, {
          type: 'AD_LOAD_TIME',
          data: {
            url: sourceUrl,
            adLoadTime: adLoadTime,
            adUrl: details.url,
            adType: details.url.includes('fastlane.json') ? 'Fastlane' : 'Google Ads',
            navigationType: navigationType,
            timestamp: currentTime
          }
        }).catch(() => {
          // Ignore errors if content script is not ready
        });
        
        // Save to storage
        chrome.storage.local.get(['adSpeedHistory'], (result) => {
          const history = result.adSpeedHistory || [];
          history.push({
            url: sourceUrl,
            adLoadTime: adLoadTime,
            adUrl: details.url,
            adType: details.url.includes('fastlane.json') ? 'Fastlane' : 'Google Ads',
            navigationType: navigationType,
            timestamp: currentTime,
            date: new Date(currentTime).toISOString()
          });
          
          // Keep only the last 100 measurements
          if (history.length > 100) {
            history.splice(0, history.length - 100);
          }
          
          chrome.storage.local.set({ adSpeedHistory: history });
        });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Clean up data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  pageLoadTimes.delete(tabId);
  fastlaneDetected.delete(tabId);
  spaNavigationTimes.delete(tabId);
});

// Handle popup messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CURRENT_TAB_DATA') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const tabData = pageLoadTimes.get(tabs[0].id);
        sendResponse({
          tabData: tabData,
          currentUrl: tabs[0].url
        });
      } else {
        sendResponse({ tabData: null, currentUrl: null });
      }
    });
    return true; // Indicates response will be asynchronous
  }
  
  if (request.type === 'GET_HISTORY') {
    chrome.storage.local.get(['adSpeedHistory'], (result) => {
      sendResponse({ history: result.adSpeedHistory || [] });
    });
    return true;
  }
  
  if (request.type === 'CLEAR_HISTORY') {
    chrome.storage.local.set({ adSpeedHistory: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
