// JavaScript for Ad Speed popup
document.addEventListener('DOMContentLoaded', function() {
  loadCurrentPageData();
  loadHistory();
  
  // Handler for clear button
  document.getElementById('clear-history').addEventListener('click', clearHistory);
});

function loadCurrentPageData() {
  chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_DATA' }, (response) => {
    const currentStatus = document.getElementById('current-status');
    
    if (response && response.tabData && response.tabData.adLoadTime) {
      // Ad detected
      const adTypeIcon = response.tabData.adType === 'Xandr' ? '⚡' : '📢';
      const adTypeText = response.tabData.adType === 'Xandr' ? 'Xandr' : 'Google Ads';
      const navTypeIcon = response.tabData.navigationType === 'spa-navigation' ? '🔄' : '🌐';
      const navTypeText = response.tabData.navigationType === 'spa-navigation' ? 'SPA' : 'Page';
      
      currentStatus.innerHTML = `
        <div class="status-card detected">
          <div class="status-title">✅ ${adTypeIcon} ${adTypeText} detected</div>
          <div class="status-time">${response.tabData.adLoadTime}ms</div>
          <div class="status-url">${response.currentUrl}</div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">
            ${navTypeIcon} ${navTypeText} Navigation
          </div>
        </div>
      `;
    } else if (response && response.tabData && response.tabData.startTime) {
      // Page loading
      const elapsed = Date.now() - response.tabData.startTime;
      currentStatus.innerHTML = `
        <div class="status-card waiting">
          <div class="status-title">⏳ Waiting for ad</div>
          <div class="status-time">${elapsed}ms</div>
          <div class="status-url">${response.currentUrl}</div>
        </div>
      `;
    } else {
      // No data
      currentStatus.innerHTML = `
        <div class="status-card no-data">
          <div class="status-title">📊 No measurement</div>
          <div style="color: #666; font-size: 14px;">
            Browse a page with ads to start measuring
          </div>
        </div>
      `;
    }
  });
}

function loadHistory() {
  chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
    const historyList = document.getElementById('history-list');
    const history = response.history || [];
    
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📈</div>
          <div>No recorded measurements</div>
          <div style="font-size: 12px; margin-top: 8px; color: #999;">
            Measurements will appear here after ad detection
          </div>
        </div>
      `;
    } else {
      const historyHtml = history
        .slice()
        .reverse() // Show most recent first
        .map(item => {
          const date = new Date(item.timestamp);
          const formattedDate = date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const adTypeIcon = item.adType === 'Xandr' ? '⚡' : '📢';
          const adTypeText = item.adType === 'Xandr' ? 'Xandr' : 'Google Ads';
          const navTypeIcon = item.navigationType === 'spa-navigation' ? '🔄' : '🌐';
          const navTypeText = item.navigationType === 'spa-navigation' ? 'SPA' : 'Page';
          
          return `
            <div class="history-item">
              <div class="history-time">${item.adLoadTime}ms</div>
              <div class="history-url">
                ${new URL(item.url).hostname} ${adTypeIcon} ${adTypeText}
              </div>
              <div class="history-date">
                ${formattedDate} • ${navTypeIcon} ${navTypeText}
              </div>
            </div>
          `;
        })
        .join('');
      
      historyList.innerHTML = historyHtml;
    }
    
    // Update statistics
    updateStats(history);
  });
}

function updateStats(history) {
  const totalCount = document.getElementById('total-count');
  const avgTime = document.getElementById('avg-time');
  
  totalCount.textContent = history.length;
  
  if (history.length > 0) {
    const average = Math.round(
      history.reduce((sum, item) => sum + item.adLoadTime, 0) / history.length
    );
    avgTime.textContent = `${average}ms`;
  } else {
    avgTime.textContent = '0ms';
  }
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all history?')) {
    chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, (response) => {
      if (response.success) {
        loadHistory(); // Reload display
      }
    });
  }
}

// Refresh data every 2 seconds if we're on a loading page
setInterval(() => {
  loadCurrentPageData();
}, 2000);
