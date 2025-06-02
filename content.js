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

// Add checkbox to a row
function addCheckboxToRow(row, netAmount) {
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
  
  // Check if already processed
  if (table.querySelector('.checkbox-header')) {
    console.log('Table already processed');
    return;
  }
  
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

// Initialize the extension
async function init() {
  try {
    await waitForTable();
    
    // Give a small delay for React to finish rendering
    setTimeout(() => {
      processTable();
    }, 500);
    
  } catch (error) {
    console.error('Transaction Enhancer Error:', error);
  }
}

// Start the extension
init();

// Watch for page changes (in case of SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (url.includes('/reporting/transactions')) {
      // Clear any existing sum display before re-initializing
      const existingSumDisplay = document.getElementById('transaction-sum-container');
      if (existingSumDisplay) {
        existingSumDisplay.remove();
      }
      setTimeout(init, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true }); 