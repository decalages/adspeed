// Background script for Ad Speed extension (Chrome Manifest V3 compatible)
// Service Worker for Chrome extensions
const browserAPI = chrome;

// Service Workers don't have persistent state, so we use chrome.storage for data persistence
const STORAGE_KEYS = {
  PAGE_LOAD_TIMES: 'pageLoadTimes',
  FASTLANE_DETECTED: 'fastlaneDetected',
  SPA_NAVIGATION_TIMES: 'spaNavigationTimes'
};

// Helper functions for storage management
async function getStorageData(key) {
  const result = await chrome.storage.local.get([key]);
  return result[key] || {};
}

async function setStorageData(key, data) {
  await chrome.storage.local.set({ [key]: data });
}

async function getTabData(tabId) {
  const pageLoadTimes = await getStorageData(STORAGE_KEYS.PAGE_LOAD_TIMES);
  return pageLoadTimes[tabId] || null;
}

async function setTabData(tabId, data) {
  const pageLoadTimes = await getStorageData(STORAGE_KEYS.PAGE_LOAD_TIMES);
  pageLoadTimes[tabId] = data;
  await setStorageData(STORAGE_KEYS.PAGE_LOAD_TIMES, pageLoadTimes);
}

async function getFastlaneStatus(tabId) {
  const fastlaneDetected = await getStorageData(STORAGE_KEYS.FASTLANE_DETECTED);
  return fastlaneDetected[tabId] || false;
}

async function setFastlaneStatus(tabId, status) {
  const fastlaneDetected = await getStorageData(STORAGE_KEYS.FASTLANE_DETECTED);
  fastlaneDetected[tabId] = status;
  await setStorageData(STORAGE_KEYS.FASTLANE_DETECTED, fastlaneDetected);
}

// Listen for navigation events (complete reloads)
browserAPI.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) { // Only for main frame
    const currentTime = Date.now();
    await setTabData(details.tabId, {
      startTime: currentTime,
      url: details.url,
      fastlaneTime: null,
      adLoadTime: null,
      isReload: true // Indicates a complete reload
    });
    await setFastlaneStatus(details.tabId, false);
    
    // Reset SPA tracking
    const spaNavigationTimes = await getStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES);
    delete spaNavigationTimes[details.tabId];
    await setStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES, spaNavigationTimes);
  }
});

// Listen for history changes (SPA navigations)
browserAPI.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId === 0) { // Only for main frame
    const currentTime = Date.now();
    const tabId = details.tabId;
    
    // Store SPA navigation time
    const spaNavigationTimes = await getStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES);
    spaNavigationTimes[tabId] = {
      startTime: currentTime,
      url: details.url,
      fastlaneTime: null,
      adLoadTime: null,
      isReload: false // Indicates SPA navigation
    };
    await setStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES, spaNavigationTimes);
    
    // Reset ad detection for this new SPA "page"
    await setFastlaneStatus(tabId, false);
    
    // Also update pageLoadTimes for compatibility
    const existingData = await getTabData(tabId);
    if (existingData) {
      await setTabData(tabId, {
        ...existingData,
        spaStartTime: currentTime,
        spaUrl: details.url,
        isReload: false
      });
    } else {
      // Create new entry if it doesn't exist
      await setTabData(tabId, {
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
browserAPI.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) {
    const tabId = details.tabId;
    const pageData = await getTabData(tabId);
    
    if (pageData) {
      // Mark that page is completely loaded
      pageData.pageCompleted = true;
      await setTabData(tabId, pageData);
    }
  }
});

// Listen for web requests to detect ads (fastlane.json or /ads)
browserAPI.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const tabId = details.tabId;
    if (tabId === -1) return; // Ignore requests without tabId
    
    // Detect advertising URLs
    const isAdRequest = details.url.includes('fastlane.json') || 
                       details.url.includes('gampad/ads') ||
                       details.url.includes('/dtb/bid?') 
    
    if (isAdRequest) {
      const pageData = await getTabData(tabId);
      const spaNavigationTimes = await getStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES);
      const spaData = spaNavigationTimes[tabId];
      
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
      
      const fastlaneStatus = await getFastlaneStatus(tabId);
      if (relevantData && !fastlaneStatus) {
        const currentTime = Date.now();
        const adLoadTime = currentTime - startTime;
        
        // Determine ad type
        let adType;
        if (details.url.includes('fastlane.json')) {
          adType = 'Fastlane';
        } else if (details.url.includes('gampad/ads')) {
          adType = 'Google Ads';
        } else if (details.url.includes('/dtb/bid?')) {
          adType = 'Amazon Ads';
        } else {
          adType = 'Unknown';
        }
        
        // Update data
        const updatedData = {
          ...relevantData,
          fastlaneTime: currentTime,
          adLoadTime: adLoadTime,
          adType: adType,
          navigationType: navigationType,
          detectionUrl: sourceUrl
        };
        
        await setTabData(tabId, updatedData);
        if (spaData) {
          const spaNavigationTimes = await getStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES);
          spaNavigationTimes[tabId] = updatedData;
          await setStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES, spaNavigationTimes);
        }
        await setFastlaneStatus(tabId, true);
        
        // Send data to content script
        browserAPI.tabs.sendMessage(tabId, {
          type: 'AD_LOAD_TIME',
          data: {
            url: sourceUrl,
            adLoadTime: adLoadTime,
            adUrl: details.url,
            adType: adType,
            navigationType: navigationType,
            timestamp: currentTime
          }
        }).catch(() => {
          // Ignore errors if content script is not ready
        });
        
        // Save to storage
        browserAPI.storage.local.get(['adSpeedHistory']).then((result) => {
          const history = result.adSpeedHistory || [];
          history.push({
            url: sourceUrl,
            adLoadTime: adLoadTime,
            adUrl: details.url,
            adType: adType,
            navigationType: navigationType,
            timestamp: currentTime,
            date: new Date(currentTime).toISOString()
          });
          
          // Keep only the last 100 measurements
          if (history.length > 100) {
            history.splice(0, history.length - 100);
          }
          
          browserAPI.storage.local.set({ adSpeedHistory: history });
        });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Clean up data when a tab is closed
browserAPI.tabs.onRemoved.addListener(async (tabId) => {
  // Clean up stored data for the closed tab
  const pageLoadTimes = await getStorageData(STORAGE_KEYS.PAGE_LOAD_TIMES);
  const fastlaneDetected = await getStorageData(STORAGE_KEYS.FASTLANE_DETECTED);
  const spaNavigationTimes = await getStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES);
  
  delete pageLoadTimes[tabId];
  delete fastlaneDetected[tabId];
  delete spaNavigationTimes[tabId];
  
  await setStorageData(STORAGE_KEYS.PAGE_LOAD_TIMES, pageLoadTimes);
  await setStorageData(STORAGE_KEYS.FASTLANE_DETECTED, fastlaneDetected);
  await setStorageData(STORAGE_KEYS.SPA_NAVIGATION_TIMES, spaNavigationTimes);
});

// Handle popup messages
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CURRENT_TAB_DATA') {
    browserAPI.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs[0]) {
        const tabData = await getTabData(tabs[0].id);
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
    browserAPI.storage.local.get(['adSpeedHistory']).then((result) => {
      sendResponse({ history: result.adSpeedHistory || [] });
    });
    return true;
  }
  
  if (request.type === 'CLEAR_HISTORY') {
    browserAPI.storage.local.set({ adSpeedHistory: [] }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});
