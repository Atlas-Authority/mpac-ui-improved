// Global state for checkbox handling
if (typeof window.mpacTransactionEnhancerState === 'undefined') {
  window.mpacTransactionEnhancerState = {
    selectAllChecked: true, // Initial default
    isInitialProcess: true,  // Flag for first-time processing
    rowCheckboxStates: {} // Stores individual row checkbox states { rowId: boolean }
  };
}

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

let nextRowIdCounter = 0; // Counter for generating unique row IDs

function getOrCreateRowId(row) {
  if (row.dataset.mpacRowId) {
    return row.dataset.mpacRowId;
  }
  // More robust ID generation could involve hashing some unique row content if available.
  // For now, a counter scoped to a processTable run is sufficient.
  const newId = `mpac-row-${nextRowIdCounter++}`;
  row.dataset.mpacRowId = newId;
  return newId;
}
 
// Add checkbox to a row
function addCheckboxToRow(row, netAmount) {
  // Check if this row already has a checkbox
  const existingCheckboxCell = row.querySelector('.checkbox-cell');
  if (existingCheckboxCell) {
    // If checkbox cell exists, ensure its checkbox state is updated based on stored state
    // This handles cases where the row might be re-rendered by the page but our cell isn't removed.
    const checkbox = existingCheckboxCell.querySelector('.transaction-checkbox');
    const rowId = getOrCreateRowId(row); // Row ID should exist or be created
    if (checkbox && rowId) {
        if (typeof window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] !== 'undefined') {
            checkbox.checked = window.mpacTransactionEnhancerState.rowCheckboxStates[rowId];
        } else if (!window.mpacTransactionEnhancerState.isInitialProcess) {
            // If reprocessing and no specific state, use selectAllChecked
            checkbox.checked = window.mpacTransactionEnhancerState.selectAllChecked;
            window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] = checkbox.checked;
        } else {
            // Initial process, should be true by default
            checkbox.checked = true;
            window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] = true;
        }
    }
    return;
  }
  
  const rowId = getOrCreateRowId(row);

  // Create checkbox container
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'checkbox-container';
  
  // Create checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'transaction-checkbox';
  checkbox.dataset.netAmount = netAmount.toString();

  // Set checked state based on global and individual stored state
  if (window.mpacTransactionEnhancerState.isInitialProcess) {
    checkbox.checked = true; // Default to checked on initial run
    window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] = true;
  } else {
    // On re-runs, restore from stored state or default to selectAll if row is new to our tracking
    checkbox.checked = typeof window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] !== 'undefined'
      ? window.mpacTransactionEnhancerState.rowCheckboxStates[rowId]
      : window.mpacTransactionEnhancerState.selectAllChecked;
    // Ensure state is recorded if it was a fallback (new row during reprocess)
    if (typeof window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] === 'undefined') {
        window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] = checkbox.checked;
    }
  }
  
  // Add change event listener
  checkbox.addEventListener('change', function() {
    window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] = this.checked;
    updateSum();
    updateSelectAllHeaderState(); // Update header checkbox state
  });
  // Prevent click from bubbling to the row and causing expand/collapse
  checkbox.addEventListener('click', function(event) {
    event.stopPropagation();
  });
  
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

  const headerContent = document.createElement('div');
  headerContent.className = 'header-content';

  const selectAllCheckbox = document.createElement('input');
  selectAllCheckbox.type = 'checkbox';
  selectAllCheckbox.id = 'select-all-checkbox';

  // Restore "Select All" checkbox's own state
  selectAllCheckbox.checked = window.mpacTransactionEnhancerState.selectAllChecked;
  // Initial indeterminate state will be set by updateSelectAllHeaderState later if needed

  selectAllCheckbox.addEventListener('change', function() {
    const isChecked = this.checked;
    window.mpacTransactionEnhancerState.selectAllChecked = isChecked;
    selectAllCheckbox.indeterminate = false; // Explicitly setting it clears indeterminate
    
    document.querySelectorAll('[role="row"]').forEach(r => {
      const cb = r.querySelector('.transaction-checkbox');
      if (cb) {
        const rowId = r.dataset.mpacRowId;
        if (rowId) { // Ensure rowId exists (it should if checkbox exists)
          window.mpacTransactionEnhancerState.rowCheckboxStates[rowId] = isChecked;
        }
        cb.checked = isChecked;
      }
    });
    updateSum();
  });
  // Prevent click from bubbling (e.g. if header itself has click handlers)
  selectAllCheckbox.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  const label = document.createElement('label');
  label.htmlFor = 'select-all-checkbox';
  label.textContent = 'Select';

  headerContent.appendChild(selectAllCheckbox);
  headerContent.appendChild(label);
  checkboxHeader.appendChild(headerContent);
  
  // Append the checkbox header after the last header (Net $ column)
  headerRow.appendChild(checkboxHeader);
}

// Process the table
function processTable() {
  nextRowIdCounter = 0; // Reset for each full processing run
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
  updateSelectAllHeaderState(); // Set header based on current row states
  updateSum();

  // Rewrite URLs every time the table is processed
  addTransactionLinks();

  // After the first successful processing, mark it as done
  if (window.mpacTransactionEnhancerState.isInitialProcess && document.getElementById('select-all-checkbox')) {
    window.mpacTransactionEnhancerState.isInitialProcess = false;
  }
}

function updateSelectAllHeaderState() {
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  if (!selectAllCheckbox) return;

  const allRowCheckboxes = document.querySelectorAll('.transaction-checkbox');
  if (allRowCheckboxes.length === 0) {
    selectAllCheckbox.checked = window.mpacTransactionEnhancerState.selectAllChecked; // Use stored global default
    selectAllCheckbox.indeterminate = false;
    // Ensure global state is consistent if no rows (e.g. true by default)
    // window.mpacTransactionEnhancerState.selectAllChecked = true; // This line might be redundant if selectAllChecked is already true
    return;
  }

  let allChecked = true;
  let allUnchecked = true;

  allRowCheckboxes.forEach(cb => {
    if (cb.checked) {
      allUnchecked = false;
    } else {
      allChecked = false;
    }
  });

  if (allChecked) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
    window.mpacTransactionEnhancerState.selectAllChecked = true;
  } else if (allUnchecked) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    window.mpacTransactionEnhancerState.selectAllChecked = false;
  } else {
    selectAllCheckbox.checked = false; // Standard for indeterminate state display
    selectAllCheckbox.indeterminate = true;
    // selectAllChecked reflects the desired state if user *were* to click it.
    // If indeterminate, clicking it would check all, so conceptually it's "not all checked".
    window.mpacTransactionEnhancerState.selectAllChecked = false;
  }
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
  nextRowIdCounter = 0; // Reset for each new table observation setup / processTable run
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
      // If the mutation is an attribute change on 'checked' for one of our checkboxes,
      // ignore it for reprocessing. The checkbox's own 'change' event handles sum updates.
      if (mutation.type === 'attributes' &&
          mutation.attributeName === 'checked' &&
          mutation.target.classList.contains('transaction-checkbox')) {
        return; // Skip this mutation, don't flag for reprocessing
      }

      // Original logic for detecting other relevant changes
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);
        
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
      
      // Check if text content of cells changed (updated amounts) or grid cells structure changed
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
    characterData: true,
    attributes: true, // Need to observe attributes for the 'checked' state
    attributeFilter: ['checked'] // Only care about 'checked' attribute changes for our specific optimization
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
  // Reset checkbox global state for a fresh page load/navigation to transactions
  if (window.mpacTransactionEnhancerState) {
    window.mpacTransactionEnhancerState.selectAllChecked = true;
    window.mpacTransactionEnhancerState.isInitialProcess = true;
    window.mpacTransactionEnhancerState.rowCheckboxStates = {}; // Clear stored states
  }
  init();
}


// Function to add a direct link to transactions for an App Entitlement Number (AEN)
function addTransactionLinks() {
  // Find all "App entitlement number" divs
  const appEntitlementDivs = document.querySelectorAll('[data-testid="app-entitlement-number"]');

  appEntitlementDivs.forEach(div => {
    // Check if we've already added our link for this div
    const parent = div.parentNode;
    if (parent.querySelector('[data-testid="aen-transactions-link"]')) {
      return; // Link already exists, do nothing
    }

    const originalLink = div.querySelector('a[href*="/reporting/licenses"]');
    if (!originalLink) {
      return; // No original link found to base our new link on
    }

    const originalHref = originalLink.getAttribute('href');
    const linkText = originalLink.textContent;

    // Create the new href for the transactions page
    const newHref = originalHref.replace('/reporting/licenses', '/reporting/transactions');

    // Create the new element to inject
    const newLinkDiv = document.createElement('div');
    newLinkDiv.className = 'css-1bh2dbg-EachPair e94bvxz2'; // Match styling of other pairs
    newLinkDiv.setAttribute('data-testid', 'aen-transactions-link');
    
    newLinkDiv.innerHTML = `
      <p>AEN Transactions Link</p>
      <p><a href="${newHref}">${linkText}</a></p>
    `;

    // Insert the new div right after the original "App entitlement number" div
    div.parentNode.insertBefore(newLinkDiv, div.nextSibling);
    console.log('Added AEN transaction link for:', linkText);
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
      // Reset checkbox global state for re-initialization
      if (window.mpacTransactionEnhancerState) {
        window.mpacTransactionEnhancerState.selectAllChecked = true;
        window.mpacTransactionEnhancerState.isInitialProcess = true;
        window.mpacTransactionEnhancerState.rowCheckboxStates = {}; // Clear stored states
      }
      initInProgress = false;
      init();
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

// The URL rewriting is now handled within processTable, which is triggered
// on initial load and on any table changes. This avoids the need for
// a separate observer or timeouts for URL rewriting.