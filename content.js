// Content script for Ad Speed

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

// Show notification when ad is detected
function showAdNotification(data) {
  // Calculate position for new notification
  const topPosition = calculateNotificationPosition();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'ad-speed-notification ad-speed-ad-notification';
  
  const adTypeIcon = data.adType === 'Fastlane' ? '⚡' : '📢';
  const navTypeIcon = data.navigationType === 'spa-navigation' ? '🔄' : '🌐';
  
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: ${topPosition}px;
      right: 20px;
      background: linear-gradient(135deg, #FF5722, #FF6B35);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 2147483647;
      font-family: Arial, sans-serif;
      font-size: 14px;
      max-width: 320px;
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
  
  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.remove();
      // Reorganize remaining notifications
      reorganizeNotifications();
    }
  }, 5000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_DATA' }, (response) => {
        resolve(response.tabData);
      });
    });
  }
};

// Utility functions to manage notification positioning
function calculateNotificationPosition() {
  const existingNotifications = document.querySelectorAll('.ad-speed-notification');
  const baseTopPosition = 20;
  
  // Calculate position based on number of existing notifications
  const totalHeight = existingNotifications.length * 90; // 90px spacing per notification
  
  return baseTopPosition + totalHeight;
}

function reorganizeNotifications() {
  const notifications = document.querySelectorAll('.ad-speed-notification');
  const baseTopPosition = 20;
  
  let currentTop = baseTopPosition;
  
  notifications.forEach((notification, index) => {
    const notificationDiv = notification.querySelector('div[style*="position: fixed"]');
    if (notificationDiv) {
      // Update top position in inline style
      const currentStyle = notificationDiv.style.cssText;
      const updatedStyle = currentStyle.replace(/top:\s*\d+px/, `top: ${currentTop}px`);
      notificationDiv.style.cssText = updatedStyle;
      
      // Calculate position for next notification (90px spacing)
      currentTop += 90;
    }
  });
}

// Clean up interval when page is unloaded
window.addEventListener('beforeunload', () => {
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
  }
});
