// Wait for the page to fully load
function waitForTable() {
  return new Promise((resolve) => {
    const checkForTable = () => {
      const table = document.querySelector('[role="treegrid"]');
      if (table) {
        resolve(table);
      } else {
        setTimeout(checkForTable, 100);
      }
    };
    checkForTable();
  });
}

// Parse net amount from text (handles negative values and removes $ and commas)
function parseNetAmount(amountText) {
  if (!amountText) return 0;
  // Remove $ sign and commas, then parse as float
  const cleanAmount = amountText.replace(/[\$,]/g, '');
  return parseFloat(cleanAmount) || 0;
}

// Format amount for display
function formatAmount(amount) {
  const sign = amount < 0 ? '-' : '';
  const absAmount = Math.abs(amount);
  return `${sign}$${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Create and add sum display
function createSumDisplay() {
  // Remove existing sum display if it exists
  const existingSumDisplay = document.getElementById('transaction-sum-container');
  if (existingSumDisplay) {
    existingSumDisplay.remove();
  }

  const sumContainer = document.createElement('div');
  sumContainer.id = 'transaction-sum-container';
  sumContainer.innerHTML = `
    <div class="sum-display">
      <strong>Selected Total: <span id="sum-amount">$0.00</span></strong>
    </div>
  `;
  
  // Insert before the table
  const table = document.querySelector('[role="treegrid"]');
  if (table && table.parentNode) {
    table.parentNode.insertBefore(sumContainer, table);
  }
  
  return sumContainer;
}

// Update the sum display
function updateSum() {
  const checkboxes = document.querySelectorAll('.transaction-checkbox:checked');
  let total = 0;
  
  checkboxes.forEach(checkbox => {
    const netAmount = parseFloat(checkbox.dataset.netAmount) || 0;
    total += netAmount;
  });
  
  const sumElement = document.getElementById('sum-amount');
  if (sumElement) {
    sumElement.textContent = formatAmount(total);
  }
}

// Clean up existing enhancements
function cleanupExistingEnhancements() {
  // Remove existing checkboxes and headers
  const existingCheckboxCells = document.querySelectorAll('.checkbox-cell');
  const existingCheckboxHeaders = document.querySelectorAll('.checkbox-header');
  const existingSumDisplay = document.getElementById('transaction-sum-container');
  
  existingCheckboxCells.forEach(cell => cell.remove());
  existingCheckboxHeaders.forEach(header => header.remove());
  if (existingSumDisplay) {
    existingSumDisplay.remove();
  }
}

// Add checkbox to a row
function addCheckboxToRow(row, netAmount) {
  // Check if this row already has a checkbox
  if (row.querySelector('.checkbox-cell')) {
    return;
  }

  // Create checkbox container
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'checkbox-container';
  
  // Create checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'transaction-checkbox';
  checkbox.checked = true; // Default to checked as requested
  checkbox.dataset.netAmount = netAmount.toString();
  
  // Add change event listener
  checkbox.addEventListener('change', updateSum);
  
  checkboxContainer.appendChild(checkbox);
  
  // Create new cell for checkbox
  const checkboxCell = document.createElement('div');
  checkboxCell.setAttribute('role', 'gridcell');
  checkboxCell.className = 'css-i9zauw checkbox-cell';
  checkboxCell.style.width = '60px';
  checkboxCell.appendChild(checkboxContainer);
  
  // Append the checkbox cell after the last cell (Net $ column)
  row.appendChild(checkboxCell);
}

// Add header for checkbox column
function addCheckboxHeader(headerRow) {
  // Check if header already has checkbox column
  if (headerRow.querySelector('.checkbox-header')) {
    return;
  }

  const checkboxHeader = document.createElement('div');
  checkboxHeader.setAttribute('role', 'columnheader');
  checkboxHeader.className = 'css-ud4ddh-HeaderStyles checkbox-header';
  checkboxHeader.style.width = '60px';
  checkboxHeader.innerHTML = `
    <div class="header-content">
      <input type="checkbox" id="select-all-checkbox" checked> 
      <label for="select-all-checkbox">Select</label>
    </div>
  `;
  
  // Add select all functionality
  const selectAllCheckbox = checkboxHeader.querySelector('#select-all-checkbox');
  selectAllCheckbox.addEventListener('change', function() {
    const allCheckboxes = document.querySelectorAll('.transaction-checkbox');
    allCheckboxes.forEach(cb => {
      cb.checked = this.checked;
    });
    updateSum();
  });
  
  // Append the checkbox header after the last header (Net $ column)
  headerRow.appendChild(checkboxHeader);
}

// Process the table
function processTable() {
  const table = document.querySelector('[role="treegrid"]');
  if (!table) return;
  
  console.log('Processing table with transaction enhancements...');
  
  // Clean up any existing enhancements first
  cleanupExistingEnhancements();
  
  // Find header row
  const headerRow = table.querySelector('[role="row"]');
  if (headerRow) {
    addCheckboxHeader(headerRow);
  }
  
  // Find all data rows
  const rowGroup = table.querySelector('[role="rowgroup"]');
  if (!rowGroup) return;
  
  const dataRows = rowGroup.querySelectorAll('[role="row"]');
  
  dataRows.forEach(row => {
    // Find the net amount cell (last cell with amount)
    const cells = row.querySelectorAll('[role="gridcell"]');
    const netAmountCell = cells[cells.length - 1]; // Last cell should be Net $
    
    if (netAmountCell) {
      const amountText = netAmountCell.textContent.trim();
      const netAmount = parseNetAmount(amountText);
      
      addCheckboxToRow(row, netAmount);
    }
  });
  
  // Create sum display
  createSumDisplay();
  
  // Initial sum calculation
  updateSum();
}

// Debounce function to prevent excessive processing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Create debounced version of processTable
const debouncedProcessTable = debounce(processTable, 300);

let currentTableObserver = null; // To manage the lifecycle of the table observer

// Set up table content observer
function setupTableObserver() {
  // Disconnect existing observer if any
  if (currentTableObserver) {
    currentTableObserver.disconnect();
    currentTableObserver = null;
    console.log('Transaction Enhancer: Disconnected old table observer.');
  }

  const table = document.querySelector('[role="treegrid"]');
  if (!table) {
    console.log('Transaction Enhancer: Table not found for setting up observer.');
    return;
  }

  console.log('Transaction Enhancer: Setting up new table observer.');
  // Observer for table content changes
  currentTableObserver = new MutationObserver((mutations) => {
    let shouldReprocess = false;
    
    mutations.forEach((mutation) => {
      // Check if rows were added, removed, or modified
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);
        
        // Check if any rows were added or removed
        const hasRowChanges = addedNodes.some(node =>
          node.nodeType === 1 && (
            node.getAttribute('role') === 'row' ||
            node.querySelector && node.querySelector('[role="row"]')
          )
        ) || removedNodes.some(node =>
          node.nodeType === 1 && (
            node.getAttribute('role') === 'row' ||
            node.querySelector && node.querySelector('[role="row"]')
          )
        );
        
        if (hasRowChanges) {
          shouldReprocess = true;
        }
      }
      
      // Check if text content of cells changed (updated amounts)
      if (mutation.type === 'characterData' ||
          (mutation.type === 'childList' && mutation.target.getAttribute('role') === 'gridcell')) {
        shouldReprocess = true;
      }
    });
    
    if (shouldReprocess) {
      console.log('Transaction Enhancer: Table content changed, reprocessing...');
      debouncedProcessTable();
    }
  });

  // Observe the table for changes
  currentTableObserver.observe(table, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// Initialize the extension
const MAX_INIT_RETRIES = 15; // Max 15 retries (e.g., 15 seconds if 1s interval)
const INIT_RETRY_INTERVAL = 1000; // 1 second
let initRetries = 0;
let initInProgress = false; // Flag to prevent multiple concurrent inits

async function init() {
  if (initInProgress) {
    console.log('Transaction Enhancer: Init already in progress.');
    return;
  }
  initInProgress = true;
  console.log(`Transaction Enhancer: init() called (attempt ${initRetries + 1}/${MAX_INIT_RETRIES}). Current URL: ${location.href}`);

  try {
    await waitForTable(); // Ensures the main table container exists
    console.log('Transaction Enhancer: Table container found.');
    
    processTable(); // Attempt to add checkboxes and sum display
    
    // Check if enhancements were successfully applied (e.g., sum display exists)
    const sumDisplay = document.getElementById('transaction-sum-container');
    if (sumDisplay) {
      console.log('Transaction Enhancer: processTable() successful, sum display found. Setting up observer.');
      setupTableObserver();
      initRetries = 0; // Reset retries on success
      initInProgress = false;
    } else {
      console.log('Transaction Enhancer: processTable() did not add sum display yet (table might be empty or rendering). Retrying...');
      initRetries++;
      if (initRetries < MAX_INIT_RETRIES) {
        setTimeout(() => {
          initInProgress = false; // Allow next attempt
          init(); // Retry
        }, INIT_RETRY_INTERVAL);
      } else {
        console.error(`Transaction Enhancer: Max retries (${MAX_INIT_RETRIES}) reached. Could not initialize enhancements.`);
        initRetries = 0; // Reset for future attempts if URL changes
        initInProgress = false;
      }
    }
  } catch (error) {
    console.error('Transaction Enhancer Error during init:', error);
    initRetries = 0; // Reset retries on error
    initInProgress = false;
  }
}

// Start the extension
// Initial init call will run if the page matches the content script pattern directly.
if (location.href.includes('/reporting/transactions')) {
  // Reset retries when starting fresh on a matching URL
  initRetries = 0;
  init();
}


// Function to rewrite entitlement URLs from licenses to transactions
function rewriteEntitlementURLs() {
  // Only run URL rewriting on transactions pages
  if (!location.href.includes('/reporting/transactions')) {
    return;
  }

  // Find all links that match the entitlement pattern and point to licenses
  const entitlementLinks = document.querySelectorAll('a[href*="marketplace.atlassian.com/manage/vendors"][href*="/reporting/licenses"][href*="text=E-"]');
  
  entitlementLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes('/reporting/licenses') && href.includes('text=E-')) {
      // Replace 'licenses' with 'transactions' in the URL
      const newHref = href.replace('/reporting/licenses', '/reporting/transactions');
      link.setAttribute('href', newHref);
      console.log('Rewritten entitlement URL:', href, '->', newHref);
    }
  });
}

// Watch for page changes (in case of SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href; // Get the current URL once
  if (currentUrl !== lastUrl) {
    console.log('Transaction Enhancer: URL changed from', lastUrl, 'to', currentUrl);
    lastUrl = currentUrl; // Update lastUrl *after* comparison and logging

    if (currentUrl.includes('/reporting/transactions')) {
      console.log('Transaction Enhancer: Navigated to transactions page, re-initializing.');
      cleanupExistingEnhancements();
      initRetries = 0;
      initInProgress = false;
      init();
      setTimeout(rewriteEntitlementURLs, 500);
    } else {
      console.log('Transaction Enhancer: Navigated away from transactions page, cleaning up.');
      cleanupExistingEnhancements();
      initRetries = 0;
      initInProgress = false;
      if (currentTableObserver) {
        currentTableObserver.disconnect();
        currentTableObserver = null;
        console.log('Transaction Enhancer: Disconnected table observer on navigating away.');
      }
    }
  }
}).observe(document, { subtree: true, childList: true });

// Run URL rewriting when the page loads
setTimeout(rewriteEntitlementURLs, 1000);

// Set up a mutation observer to catch dynamically added content (like expandable rows)
const urlRewriteObserver = new MutationObserver((mutations) => {
  let shouldRewrite = false;
  
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const addedNodes = Array.from(mutation.addedNodes);
      
      // Check if any added nodes contain links that might need rewriting
      const hasRelevantLinks = addedNodes.some(node => 
        node.nodeType === 1 && (
          node.querySelector && (
            node.querySelector('a[href*="/reporting/licenses"]') ||
            node.matches && node.matches('a[href*="/reporting/licenses"]')
          )
        )
      );
      
      if (hasRelevantLinks) {
        shouldRewrite = true;
      }
    }
  });
  
  if (shouldRewrite) {
    console.log('New content detected, checking for entitlement URLs to rewrite...');
    setTimeout(rewriteEntitlementURLs, 100);
  }
});

// Observe the entire document for changes
urlRewriteObserver.observe(document, {
  childList: true,
  subtree: true
}); 