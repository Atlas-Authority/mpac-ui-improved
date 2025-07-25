// Default settings configuration
const DEFAULT_SETTINGS = {
  // Processing
  batchLimit: 5,                    // -1 for unlimited (when "All" is checked)
  lateRefundDays: 84,
  autoTicketing: 'prefill',         // 'manual', 'prefill', 'analysis'
  
  // Behavior  
  defaultChecked: true,
  autoAnalysis: false,
  autoExpand: true,
  skipIfNoNew: true,
  
  // Tab Management
  autoCloseClean: false,
  autoCloseMinutes: 0,              // 0 = never
  keepLastTabs: 10,                 // 0 = unlimited
  
  // Notifications
  notificationSeconds: 10,          // 0 = never
  enableRelationshipNotifs: true,
  
  
  // URL Handling
  urlRewritingEnabled: true,
  urlOpenNewTab: true,
  
  // Debug Settings
  debug: {
    pageStabilizeMs: 3000,
    rowWaitMs: 2000,
    intervalMs: 500,
    maxRetries: 15,
    retryIntervalMs: 1000
  }
};

// Storage key for user settings
const SETTINGS_KEY = 'mpac_user_settings';

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  initializeTabs();
  loadSettings();
  setupEventListeners();
  checkCurrentTab();
});

// Tab management
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      this.classList.add('active');
      document.getElementById(targetTab + '-tab').classList.add('active');
    });
  });
}

// Load settings from storage and populate UI
function loadSettings() {
  chrome.storage.local.get([SETTINGS_KEY], function(result) {
    const settings = result[SETTINGS_KEY] || DEFAULT_SETTINGS;
    populateUI(settings);
  });
}

// Populate UI with settings values
function populateUI(settings) {
  // Processing settings
  const batchLimitAll = settings.batchLimit === -1;
  document.getElementById('batchLimit').value = batchLimitAll ? 5 : settings.batchLimit;
  document.getElementById('batchLimitValue').textContent = batchLimitAll ? '5' : settings.batchLimit;
  document.getElementById('batchLimitAll').checked = batchLimitAll;
  document.getElementById('batchLimit').disabled = batchLimitAll;
  
  document.getElementById('lateRefundDays').value = settings.lateRefundDays;
  document.getElementById('lateRefundDaysValue').textContent = settings.lateRefundDays;
  
  document.querySelector(`input[name="autoTicketing"][value="${settings.autoTicketing}"]`).checked = true;
  
  // Behavior settings
  document.getElementById('defaultChecked').checked = settings.defaultChecked;
  document.getElementById('autoAnalysis').checked = settings.autoAnalysis;
  document.getElementById('autoExpand').checked = settings.autoExpand;
  document.getElementById('skipIfNoNew').checked = settings.skipIfNoNew;
  
  // Tab Management settings
  document.getElementById('autoCloseClean').checked = settings.autoCloseClean;
  document.getElementById('autoCloseMinutes').value = settings.autoCloseMinutes;
  document.getElementById('autoCloseMinutesValue').textContent = 
    settings.autoCloseMinutes === 0 ? 'Never' : settings.autoCloseMinutes;
  document.getElementById('keepLastTabs').value = settings.keepLastTabs;
  document.getElementById('keepLastTabsValue').textContent = 
    settings.keepLastTabs === 0 ? 'Unlimited' : settings.keepLastTabs;
  
  // Notification settings
  document.getElementById('notificationSeconds').value = settings.notificationSeconds;
  document.getElementById('notificationSecondsValue').textContent = 
    settings.notificationSeconds === 0 ? 'Never' : settings.notificationSeconds;
  document.getElementById('enableRelationshipNotifs').checked = settings.enableRelationshipNotifs;
  
  
  // URL Handling settings
  document.getElementById('urlRewritingEnabled').checked = settings.urlRewritingEnabled;
  document.getElementById('urlOpenNewTab').checked = settings.urlOpenNewTab;
  
  // Debug settings
  document.getElementById('pageStabilizeMs').value = settings.debug.pageStabilizeMs;
  document.getElementById('rowWaitMs').value = settings.debug.rowWaitMs;
  document.getElementById('intervalMs').value = settings.debug.intervalMs;
  document.getElementById('maxRetries').value = settings.debug.maxRetries;
  document.getElementById('retryIntervalMs').value = settings.debug.retryIntervalMs;
}

// Setup event listeners for all settings controls
function setupEventListeners() {
  // Batch limit slider and "All" checkbox
  const batchLimit = document.getElementById('batchLimit');
  const batchLimitAll = document.getElementById('batchLimitAll');
  const batchLimitValue = document.getElementById('batchLimitValue');
  
  batchLimit.addEventListener('input', function() {
    batchLimitValue.textContent = this.value;
    saveSettings();
  });
  
  batchLimitAll.addEventListener('change', function() {
    batchLimit.disabled = this.checked;
    if (this.checked) {
      batchLimitValue.textContent = 'All';
    } else {
      batchLimitValue.textContent = batchLimit.value;
    }
    saveSettings();
  });
  
  // Late refund days slider
  const lateRefundDays = document.getElementById('lateRefundDays');
  const lateRefundDaysValue = document.getElementById('lateRefundDaysValue');
  
  lateRefundDays.addEventListener('input', function() {
    lateRefundDaysValue.textContent = this.value;
    saveSettings();
  });
  
  // Auto-ticketing radio buttons
  document.querySelectorAll('input[name="autoTicketing"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
  
  // Behavior checkboxes
  document.getElementById('defaultChecked').addEventListener('change', saveSettings);
  document.getElementById('autoAnalysis').addEventListener('change', saveSettings);
  document.getElementById('autoExpand').addEventListener('change', saveSettings);
  document.getElementById('skipIfNoNew').addEventListener('change', saveSettings);
  
  // Tab management settings
  document.getElementById('autoCloseClean').addEventListener('change', saveSettings);
  
  const autoCloseMinutes = document.getElementById('autoCloseMinutes');
  const autoCloseMinutesValue = document.getElementById('autoCloseMinutesValue');
  
  autoCloseMinutes.addEventListener('input', function() {
    autoCloseMinutesValue.textContent = this.value === '0' ? 'Never' : this.value;
    saveSettings();
  });
  
  const keepLastTabs = document.getElementById('keepLastTabs');
  const keepLastTabsValue = document.getElementById('keepLastTabsValue');
  
  keepLastTabs.addEventListener('input', function() {
    keepLastTabsValue.textContent = this.value === '0' ? 'Unlimited' : this.value;
    saveSettings();
  });
  
  // Notification settings
  const notificationSeconds = document.getElementById('notificationSeconds');
  const notificationSecondsValue = document.getElementById('notificationSecondsValue');
  
  notificationSeconds.addEventListener('input', function() {
    notificationSecondsValue.textContent = this.value === '0' ? 'Never' : this.value;
    saveSettings();
  });
  
  document.getElementById('enableRelationshipNotifs').addEventListener('change', saveSettings);
  
  
  // URL handling settings
  document.getElementById('urlRewritingEnabled').addEventListener('change', saveSettings);
  document.getElementById('urlOpenNewTab').addEventListener('change', saveSettings);
  
  // Debug settings
  document.getElementById('pageStabilizeMs').addEventListener('change', saveSettings);
  document.getElementById('rowWaitMs').addEventListener('change', saveSettings);
  document.getElementById('intervalMs').addEventListener('change', saveSettings);
  document.getElementById('maxRetries').addEventListener('change', saveSettings);
  document.getElementById('retryIntervalMs').addEventListener('change', saveSettings);
  
  // Reset processing state button
  document.getElementById('resetProcessingStateButton').addEventListener('click', resetProcessingState);
}

// Save current settings to storage
function saveSettings() {
  const settings = {
    // Processing
    batchLimit: document.getElementById('batchLimitAll').checked ? -1 : parseInt(document.getElementById('batchLimit').value),
    lateRefundDays: parseInt(document.getElementById('lateRefundDays').value),
    autoTicketing: document.querySelector('input[name="autoTicketing"]:checked').value,
    
    // Behavior
    defaultChecked: document.getElementById('defaultChecked').checked,
    autoAnalysis: document.getElementById('autoAnalysis').checked,
    autoExpand: document.getElementById('autoExpand').checked,
    skipIfNoNew: document.getElementById('skipIfNoNew').checked,
    
    // Tab Management
    autoCloseClean: document.getElementById('autoCloseClean').checked,
    autoCloseMinutes: parseInt(document.getElementById('autoCloseMinutes').value),
    keepLastTabs: parseInt(document.getElementById('keepLastTabs').value),
    
    // Notifications
    notificationSeconds: parseInt(document.getElementById('notificationSeconds').value),
    enableRelationshipNotifs: document.getElementById('enableRelationshipNotifs').checked,
    
    // URL Handling
    urlRewritingEnabled: document.getElementById('urlRewritingEnabled').checked,
    urlOpenNewTab: document.getElementById('urlOpenNewTab').checked,
    
    // Debug Settings
    debug: {
      pageStabilizeMs: parseInt(document.getElementById('pageStabilizeMs').value),
      rowWaitMs: parseInt(document.getElementById('rowWaitMs').value),
      intervalMs: parseInt(document.getElementById('intervalMs').value),
      maxRetries: parseInt(document.getElementById('maxRetries').value),
      retryIntervalMs: parseInt(document.getElementById('retryIntervalMs').value)
    }
  };
  
  chrome.storage.local.set({ [SETTINGS_KEY]: settings }, function() {
    showSaveIndicator();
  });
}


// Show save indicator briefly
function showSaveIndicator() {
  const indicator = document.getElementById('save-indicator');
  indicator.classList.add('show');
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 1000);
}

// Check current tab compatibility (same as before)
function checkCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    const statusElement = document.getElementById('status');
    
    if (currentTab.url && currentTab.url.includes('marketplace.atlassian.com/manage/vendors/') && currentTab.url.includes('/reporting/transactions')) {
      statusElement.textContent = 'Active on Transactions page';
      statusElement.className = 'status active';
    } else if (currentTab.url && currentTab.url.includes('marketplace.atlassian.com')) {
      statusElement.textContent = 'Navigate to Transactions to activate';
      statusElement.className = 'status inactive';
    } else {
      statusElement.textContent = 'Not on Atlassian Marketplace';
      statusElement.className = 'status inactive';
    }
  });
}

// Reset processing state function
async function resetProcessingState() {
  try {
    // Clear all processing-related storage
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({
        activeRefundJob: null,
        refundQueue: [],
        totalRefundsToProcess: 0,
        processedRefundsCount: 0
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    console.log('Processing state has been reset from popup');
    
    // Show success indicator
    showSaveIndicator();
    
    // Show confirmation to user
    alert('Processing state has been reset. You can now start new processing.');
    
  } catch (error) {
    console.error('Error resetting processing state from popup:', error);
    alert('Error resetting processing state. Check console for details.');
  }
}

// Export settings utilities for content script access
window.mpacSettings = {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  
  // Utility function to get settings (can be used by content script)
  getSettings: function(callback) {
    chrome.storage.local.get([SETTINGS_KEY], function(result) {
      const settings = result[SETTINGS_KEY] || DEFAULT_SETTINGS;
      callback(settings);
    });
  }
};
