// Check if current tab is compatible with the extension
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