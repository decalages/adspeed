// Content script for Ad Speed (Chrome Manifest V3 compatible)
const browserAPI = chrome;

let pageStartTime = Date.now();
let adDetected = false;
let lastUrl = window.location.href;

// Detect URL changes for SPAs
function detectSPANavigation() {
  const currentUrl = window.location.href;
  
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    pageStartTime = Date.now();
    adDetected = false; // Reset for new SPA "page"
    
    // For SPA navigations, we need to ensure our notification system is ready
    // Reset hydration status for new SPA page but start checking again
    isHydrationComplete = false;
    
    // Check if our container still exists, recreate if needed
    if (!getNotificationContainer()) {
      console.warn('Ad Speed: Notification container was lost during SPA navigation, will recreate when needed');
    }
    
    // Restart hydration detection for the new SPA page
    waitForHydration();
    
    // Don't show notification for SPA navigations
    // Notifications are only shown when ads are detected
  }
}

// Observe URL changes via History API
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  // Use longer delay to ensure URL is updated
  setTimeout(detectSPANavigation, 100);
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  // Use longer delay to ensure URL is updated
  setTimeout(detectSPANavigation, 100);
};

// Listen for popstate events (back/forward button)
window.addEventListener('popstate', (event) => {
  setTimeout(detectSPANavigation, 100);
});

// Observe URL changes with safety interval
let urlCheckInterval = setInterval(() => {
  detectSPANavigation();
}, 1000);

// Listen for hash changes (for hash-based SPAs)
window.addEventListener('hashchange', (event) => {
  setTimeout(detectSPANavigation, 100);
});

// Add listener for link clicks
document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (link && link.href) {
    setTimeout(detectSPANavigation, 200);
  }
}, true);

// Global state for notification management
let notificationContainer = null;
let isHydrationComplete = false;
let pendingNotifications = [];
let hydrationCheckInterval = null;

// Check if Next.js hydration is complete
function checkHydrationStatus() {
  // Multiple indicators that hydration might be complete
  const indicators = [
    // Next.js specific indicators
    window.__NEXT_HYDRATED,
    document.querySelector('[data-reactroot]'),
    document.querySelector('#__next'),
    // React indicators
    window.React,
    // General indicators - DOM is stable and interactive
    document.readyState === 'complete'
  ];
  
  return indicators.some(indicator => indicator) || 
         // Fallback: if it's been more than 3 seconds since page load
         (Date.now() - pageStartTime) > 3000;
}

// Create or get the notification container
function getNotificationContainer() {
  if (notificationContainer && notificationContainer.parentNode) {
    return notificationContainer;
  }
  
  // Create a persistent container that's less likely to be removed by React
  notificationContainer = document.createElement('div');
  notificationContainer.id = 'ad-speed-notifications-container';
  notificationContainer.setAttribute('data-ad-speed-extension', 'true');
  notificationContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    pointer-events: none;
    z-index: 2147483647;
    font-family: Arial, sans-serif;
  `;
  
  // Try to append to documentElement first (more stable), fallback to body
  try {
    if (document.documentElement) {
      document.documentElement.appendChild(notificationContainer);
    } else if (document.body) {
      document.body.appendChild(notificationContainer);
    } else {
      // If neither exists, wait and try again
      return null;
    }
  } catch (error) {
    console.warn('Ad Speed: Could not create notification container:', error);
    return null;
  }
  
  return notificationContainer;
}

// Show notification when ad is detected
function showAdNotification(data) {
  // If hydration isn't complete, queue the notification
  if (!isHydrationComplete && !checkHydrationStatus()) {
    pendingNotifications.push(data);
    return;
  }
  
  const container = getNotificationContainer();
  if (!container) {
    // If we can't create container, queue for later
    pendingNotifications.push(data);
    return;
  }
  
  // Calculate position for new notification
  const topPosition = calculateNotificationPosition();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'ad-speed-notification ad-speed-ad-notification';
  notification.setAttribute('data-ad-speed-notification', 'true');
  
  const adTypeIcon = data.adType === 'Fastlane' ? '⚡' : '📢';
  const navTypeIcon = data.navigationType === 'spa-navigation' ? '🔄' : '🌐';
  
  notification.innerHTML = `
    <div style="
      position: relative;
      top: ${topPosition}px;
      right: 20px;
      background: linear-gradient(135deg, #FF5722, #FF6B35);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-size: 14px;
      max-width: 320px;
      margin-bottom: 10px;
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="font-weight: bold; margin-bottom: 4px;">🚀 Ad Speed</div>
      <div>${adTypeIcon} Adserver called after ${data.adLoadTime}ms</div>
      <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">
        ${navTypeIcon} ${new URL(data.url).hostname}
      </div>
    </div>
  `;
  
  // Add CSS animation
  if (!document.querySelector('#ad-speed-animations')) {
    const style = document.createElement('style');
    style.id = 'ad-speed-animations';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  container.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.remove();
      // Reorganize remaining notifications
      reorganizeNotifications();
    }
  }, 5000);
}

// Process any pending notifications after hydration
function processPendingNotifications() {
  if (pendingNotifications.length > 0) {
    const notifications = [...pendingNotifications];
    pendingNotifications = [];
    notifications.forEach(data => showAdNotification(data));
  }
}

// Wait for hydration to complete
function waitForHydration() {
  // Clear any existing interval to avoid duplicates
  if (hydrationCheckInterval) {
    clearInterval(hydrationCheckInterval);
    hydrationCheckInterval = null;
  }
  
  if (checkHydrationStatus()) {
    isHydrationComplete = true;
    processPendingNotifications();
    return;
  }
  
  // Check periodically for hydration completion
  hydrationCheckInterval = setInterval(() => {
    if (checkHydrationStatus()) {
      isHydrationComplete = true;
      clearInterval(hydrationCheckInterval);
      hydrationCheckInterval = null;
      processPendingNotifications();
    }
  }, 100);
  
  // Fallback: assume hydration is complete after 5 seconds
  setTimeout(() => {
    if (!isHydrationComplete) {
      isHydrationComplete = true;
      if (hydrationCheckInterval) {
        clearInterval(hydrationCheckInterval);
        hydrationCheckInterval = null;
      }
      processPendingNotifications();
    }
  }, 5000);
}

// Start waiting for hydration
waitForHydration();

// Listen for messages from background script
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AD_LOAD_TIME') {
    if (!adDetected) {
      adDetected = true;
      showAdNotification(request.data);
      
      // Send custom event for developers
      window.dispatchEvent(new CustomEvent('adSpeedDetected', {
        detail: request.data
      }));
    }
    sendResponse({ received: true });
  }
});

// Observe DOM mutations to detect dynamic changes
const observer = new MutationObserver((mutations) => {
  // This function could be extended to detect other ad signals
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
} else {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Expose API for developers who want to access data
window.AdSpeed = {
  getLastMeasurement: () => {
    return new Promise((resolve) => {
      browserAPI.runtime.sendMessage({ type: 'GET_CURRENT_TAB_DATA' }, (response) => {
        resolve(response.tabData);
      });
    });
  }
};

// Utility functions to manage notification positioning
function calculateNotificationPosition() {
  const container = getNotificationContainer();
  if (!container) return 20;
  
  const existingNotifications = container.querySelectorAll('.ad-speed-notification');
  
  // Since we're using relative positioning within the container, 
  // we just return 0 for new notifications (they stack naturally)
  return 20;
}

function reorganizeNotifications() {
  const container = getNotificationContainer();
  if (!container) return;
  
  const notifications = container.querySelectorAll('.ad-speed-notification');
  
  // With the new approach using relative positioning and margin-bottom,
  // notifications naturally stack, so we don't need to manually reorganize
  // But we can add a smooth transition if needed
  notifications.forEach((notification, index) => {
    const notificationDiv = notification.querySelector('div');
    if (notificationDiv) {
      notificationDiv.style.transition = 'all 0.3s ease-out';
    }
  });
}

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', () => {
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
  }
  if (hydrationCheckInterval) {
    clearInterval(hydrationCheckInterval);
  }
});

// Add a mutation observer to detect if our container gets removed by React/Next.js
const containerObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      // Check if our container was removed
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && 
            (node.id === 'ad-speed-notifications-container' || 
             node.querySelector && node.querySelector('#ad-speed-notifications-container'))) {
          // Our container was removed, reset it
          notificationContainer = null;
        }
      });
    }
  });
});

// Start observing document changes
if (document.documentElement) {
  containerObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
