// Global state for checkbox handling
if (typeof window.mpacTransactionEnhancerState === 'undefined') {
  window.mpacTransactionEnhancerState = {
    selectAllChecked: true, // Initial default
    isInitialProcess: true,  // Flag for first-time processing
    rowCheckboxStates: {}, // Stores individual row checkbox states { rowId: boolean }
    analysisData: null,
    isAutomatedJob: false
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

// Wait for data rows to appear in the table
function waitForRows() {
  return new Promise((resolve) => {
    const checkForRows = () => {
      const rowGroup = document.querySelector('[role="rowgroup"]');
      const rows = rowGroup ? rowGroup.querySelectorAll('[role="row"]') : null;
      if (rows && rows.length > 0) {
        console.log(`Found ${rows.length} data rows.`);
        resolve(rows);
      } else {
        setTimeout(checkForRows, 100);
      }
    };
    checkForRows();
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

// Show modal instead of alert
function showModal(title, message, onClose = null) {
  // Remove any existing modal
  const existingModal = document.querySelector('.mpac-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'mpac-modal';
  modal.innerHTML = `
    <div class="mpac-modal-content">
      <div class="mpac-modal-title">${title}</div>
      <div class="mpac-modal-message">${message}</div>
      <button class="mpac-modal-button" onclick="this.closest('.mpac-modal').remove()">OK</button>
    </div>
  `;

  // Add click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      if (onClose) onClose();
    }
  });

  // Add escape key to close
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
      if (onClose) onClose();
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Handle button click
  const button = modal.querySelector('.mpac-modal-button');
  button.addEventListener('click', () => {
    modal.remove();
    document.removeEventListener('keydown', handleEscape);
    if (onClose) onClose();
  });

  document.body.appendChild(modal);
}



// Promisified storage.get with error checking
function storageGet(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result);
        });
    });
}

// Promisified storage.set with error checking
function storageSet(items) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve();
        });
    });
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
      <div class="button-group" style="margin-left: 15px;">
        <button id="process-button" class="css-1l34k60">Process</button>
        <div class="dropdown">
          <button id="dropdown-button" class="css-1l34k60">▼</button>
          <div id="dropdown-content" class="dropdown-content">
            <a href="#" id="expand-collapse-all-dropdown">Expand/Collapse All</a>
            <a href="#" id="analyze-button-dropdown">Analyze Maintenance Periods</a>
            <a href="#" id="file-support-ticket-button-dropdown">File Support Ticket</a>
            <a href="#" id="reset-processing-state-dropdown">Reset Processing State</a>
            <a href="#" id="reset-history-page-records-dropdown">Reset History for Page Records</a>
          </div>
        </div>
      </div>
    </div>
    <div id="gap-analysis-results" style="margin-top: 10px;"></div>
  `;
  
  // Insert before the table
  const table = document.querySelector('[role="treegrid"]');
  if (table && table.parentNode) {
    table.parentNode.insertBefore(sumContainer, table);
  }
  
  return sumContainer;
}

// --- Unique ID Generation ---
function getGapId(gap) {
    return `gap-${gap.start}-${gap.end}`;
}

function getLateRefundId(item) {
    const refundDate = item.refund.saleDate.toISOString().split('T')[0];
    const originalTxDate = item.originalTx.saleDate.toISOString().split('T')[0];
    return `late-refund-${refundDate}-${originalTxDate}-${item.refund.periodStr}`;
}

function getRefundId(refund) {
    const orderId = refund.orderId || 'unknown-order';
    return `refund-${orderId}`;
}

// --- UI Manipulation ---
function addStatusIndicator(row, status) {
    // Remove existing indicator first to prevent duplicates
    const existingIndicator = row.querySelector('.status-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    if (!status) return;

    const indicator = document.createElement('span');
    indicator.className = 'status-indicator';
    
    if (status === 'clean') {
        indicator.textContent = '✅';
        indicator.title = 'Transaction analyzed and appears correct.';
        indicator.style.marginLeft = '8px';
        indicator.style.cursor = 'default';
    } else if (status === 'needs_reanalysis') {
        indicator.textContent = '⚠️';
        indicator.title = 'Transaction needs re-analysis due to new related activity.';
        indicator.style.marginLeft = '8px';
        indicator.style.cursor = 'default';
    } else if (status === 'issues') {
        indicator.textContent = '❌';
        indicator.title = 'Transaction has confirmed issues.';
        indicator.style.marginLeft = '8px';
        indicator.style.cursor = 'default';
    } else if (status === 'ok') {
        // Legacy support
        indicator.textContent = '✅';
        indicator.title = 'Transaction analyzed and appears correct.';
        indicator.style.marginLeft = '8px';
        indicator.style.cursor = 'default';
    }
    console.log(`Adding status indicator '${status}' to row:`, row);

    // Inject into the first cell, after the expand button if it exists
    const firstCell = row.querySelector('div[role="gridcell"]:first-child');
    if (firstCell) {
        firstCell.style.display = 'flex';
        firstCell.style.alignItems = 'center';
        const expandButton = firstCell.querySelector('button');
        if (expandButton) {
            expandButton.insertAdjacentElement('afterend', indicator);
        } else {
            firstCell.appendChild(indicator);
        }
    }
}

async function applyProcessedVisuals() {
    console.log("applyProcessedVisuals: Running with Order ID primary tracking...");
    
    // Primary: Use Order ID status mapping (works with collapsed rows)
    const orderStatusKey = 'orderIdStatuses';
    const data = await storageGet(orderStatusKey);
    const orderStatuses = data[orderStatusKey] || {};

    console.log(`applyProcessedVisuals: Found ${Object.keys(orderStatuses).length} Order ID statuses in storage.`);

    const transactionRows = document.querySelectorAll('div[role="row"]');
    console.log(`applyProcessedVisuals: Found ${transactionRows.length} transaction rows on the page.`);

    let appliedCount = 0;
    transactionRows.forEach(row => {
        const orderIdElement = row.querySelector('div.css-1dzhcs > div:nth-child(2) > span > span');
        if (orderIdElement) {
            const orderId = orderIdElement.textContent.trim();
            
            if (orderStatuses[orderId]) {
                const status = orderStatuses[orderId];
                console.log(`applyProcessedVisuals: Found Order ID ${orderId} with status ${status}.`);
                addStatusIndicator(row, status);
                appliedCount++;
            }
        }
    });
    
    console.log(`applyProcessedVisuals: Applied ${appliedCount} status indicators.`);

    // Secondary: Check for relationship changes if AEN is available
    const aenElement = document.querySelector('[data-testid="app-entitlement-number"] a');
    if (aenElement) {
        const aen = aenElement.textContent.trim();
        console.log(`applyProcessedVisuals: AEN ${aen} available for relationship checking.`);
        // This will be called separately for notifications
    }
}

async function analyzeMaintenancePeriods() {
    console.log("analyzeMaintenancePeriods: Starting analysis...");
    
    const aenElement = document.querySelector('[data-testid="app-entitlement-number"] a');
    const aen = aenElement ? aenElement.textContent.trim() : null;
    console.log(`analyzeMaintenancePeriods: Found AEN: ${aen}`);
    
    if (!aen) {
        console.log("AEN not found, can't check for existing tickets.");
        // Continue without ticket status if AEN isn't on the page
    }

    // Fetch existing ticket data
    const ticketedItemsStorageKey = `ticketedItems_${aen}`;
    const storedData = aen ? (await storageGet(ticketedItemsStorageKey))[ticketedItemsStorageKey] : null;
    const ticketedIds = new Set(storedData || []);

    const transactions = [];
    // Try both custom attribute and fallback to all rows in rowgroup
    let transactionRows = document.querySelectorAll('div[data-mpac-row-id]');
    
    // If no custom rows found, look for all rows in the rowgroup (automated processing case)
    if (transactionRows.length === 0) {
        console.log("analyzeMaintenancePeriods: No rows with custom attributes found, looking for all rows");
        const rowGroup = document.querySelector('[role="rowgroup"]');
        if (rowGroup) {
            transactionRows = rowGroup.querySelectorAll('[role="row"]');
            console.log(`analyzeMaintenancePeriods: Found ${transactionRows.length} rows in rowgroup`);
        }
    } else {
        console.log(`analyzeMaintenancePeriods: Found ${transactionRows.length} rows with custom attributes`);
    }

    transactionRows.forEach((row, index) => {
        console.log(`analyzeMaintenancePeriods: Processing row ${index + 1}`);
        
        const saleDateCell = row.querySelector('div[role="gridcell"]:nth-child(1)');
        const dateMatch = saleDateCell ? saleDateCell.textContent.match(/\d{4}-\d{2}-\d{2}/) : null;
        const saleDateText = dateMatch ? dateMatch[0] : null;
        const saleDate = saleDateText ? new Date(`${saleDateText}T00:00:00Z`) : null;
        console.log(`analyzeMaintenancePeriods: Row ${index + 1} sale date: ${saleDateText}`);

        const saleTypeCell = row.querySelector('div[role="gridcell"]:nth-child(5)');
        const saleType = saleTypeCell ? saleTypeCell.textContent.trim().toLowerCase() : 'unknown';
        console.log(`analyzeMaintenancePeriods: Row ${index + 1} sale type: ${saleType}`);
        
        const orderIdElement = row.querySelector('div.css-1dzhcs > div:nth-child(2) > span > span');
        const orderId = orderIdElement ? orderIdElement.textContent.trim() : null;
        if (!orderId) {
            console.log(`analyzeMaintenancePeriods: Could not find Order ID for row ${index + 1}:`, row);
        } else {
            console.log(`analyzeMaintenancePeriods: Row ${index + 1} order ID: ${orderId}`);
        }

        const detailsMain = row.nextElementSibling?.querySelector('main.css-1gxi3n2-Main');
        if (detailsMain) {
            console.log(`analyzeMaintenancePeriods: Row ${index + 1} has details section`);
            const detailPairs = detailsMain.querySelectorAll('.css-1bh2dbg-EachPair');
            console.log(`analyzeMaintenancePeriods: Row ${index + 1} has ${detailPairs.length} detail pairs`);
            
            let maintenancePeriodText = null;
            detailPairs.forEach((pair, pairIndex) => {
                const pElements = pair.getElementsByTagName('p');
                if (pElements.length > 1) {
                    const label = pElements[0].textContent.trim();
                    const value = pElements[1].textContent.trim();
                    console.log(`analyzeMaintenancePeriods: Row ${index + 1} pair ${pairIndex + 1}: "${label}" = "${value}"`);
                    if (label === 'Maintenance period') {
                        maintenancePeriodText = value;
                    }
                }
            });

            if (maintenancePeriodText) {
                console.log(`analyzeMaintenancePeriods: Row ${index + 1} maintenance period: ${maintenancePeriodText}`);
                const [startDateStr, endDateStr] = maintenancePeriodText.split(' to ');
                if (startDateStr && endDateStr) {
                    const startDate = new Date(`${startDateStr}T00:00:00Z`);
                    const endDate = new Date(`${endDateStr}T00:00:00Z`);
                    if (!isNaN(startDate) && !isNaN(endDate) && saleDate && !isNaN(saleDate)) {
                        transactions.push({ row, saleDate, startDate, endDate, saleType, periodStr: maintenancePeriodText, orderId });
                        console.log(`analyzeMaintenancePeriods: Added transaction for row ${index + 1}`);
                    } else {
                        console.log(`analyzeMaintenancePeriods: Row ${index + 1} has invalid dates`);
                    }
                } else {
                    console.log(`analyzeMaintenancePeriods: Row ${index + 1} maintenance period format invalid`);
                }
            } else {
                console.log(`analyzeMaintenancePeriods: Row ${index + 1} has no maintenance period`);
            }
        } else {
            console.log(`analyzeMaintenancePeriods: Row ${index + 1} has no details section`);
        }
    });

    console.log(`analyzeMaintenancePeriods: Processed ${transactions.length} valid transactions`);

    const renewals = transactions.filter(t => t.saleType !== 'refund');
    const refunds = transactions.filter(t => t.saleType === 'refund');

    // --- Late Refund Logic ---
    const lateRefunds = [];
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    for (const refund of refunds) {
        const potentialOriginalTxs = renewals
            .filter(r =>
                r.periodStr === refund.periodStr &&
                r.saleDate < refund.saleDate
            )
            .sort((a, b) => b.saleDate - a.saleDate);

        if (potentialOriginalTxs.length > 0) {
            const originalTx = potentialOriginalTxs[0];
            const timeDiff = refund.saleDate.getTime() - originalTx.saleDate.getTime();

            if (timeDiff > thirtyDaysInMs) {
                const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
                lateRefunds.push({
                    refund,
                    originalTx,
                    days: daysDiff
                });
            }
        }
    }

    // --- Gap Analysis Logic (uses active renewals) ---
    const activeRenewals = [];
    const usedRefunds = new Set();

    for (const renewal of renewals) {
        const matchingRefundIndex = refunds.findIndex((refund, index) =>
            !usedRefunds.has(index) &&
            refund.startDate.getTime() === renewal.startDate.getTime() &&
            refund.endDate.getTime() === renewal.endDate.getTime()
        );

        if (matchingRefundIndex !== -1) {
            usedRefunds.add(matchingRefundIndex);
        } else {
            activeRenewals.push(renewal);
        }
    }

    activeRenewals.sort((a, b) => a.startDate - b.startDate);

    const mergedPeriods = [];
    if (activeRenewals.length > 0) {
        let currentPeriod = { ...activeRenewals[0] };
        for (let i = 1; i < activeRenewals.length; i++) {
            const nextPeriod = activeRenewals[i];
            const dayAfterCurrentEnd = new Date(currentPeriod.endDate);
            dayAfterCurrentEnd.setUTCDate(dayAfterCurrentEnd.getUTCDate() + 1);

            if (nextPeriod.startDate <= dayAfterCurrentEnd) {
                if (nextPeriod.endDate > currentPeriod.endDate) {
                    currentPeriod.endDate = nextPeriod.endDate;
                }
            } else {
                mergedPeriods.push(currentPeriod);
                currentPeriod = { ...nextPeriod };
            }
        }
        mergedPeriods.push(currentPeriod);
    }

    const gaps = [];
    for (let i = 0; i < mergedPeriods.length - 1; i++) {
        const currentEndDate = mergedPeriods[i].endDate;
        const nextStartDate = mergedPeriods[i + 1].startDate;

        const gapStartDate = new Date(currentEndDate.getTime());
        gapStartDate.setUTCDate(gapStartDate.getUTCDate() + 1);

        if (gapStartDate < nextStartDate) {
            const gapEndDate = new Date(nextStartDate.getTime());
            gapEndDate.setUTCDate(gapEndDate.getUTCDate() - 1);

            if (gapEndDate >= gapStartDate) {
                const timeDiff = gapEndDate.getTime() - gapStartDate.getTime();
                const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24)) + 1;
                gaps.push({
                    start: gapStartDate.toISOString().split('T')[0],
                    end: gapEndDate.toISOString().split('T')[0],
                    days: dayDiff
                });
            }
        }
    }

    // --- Store Analysis Data for Ticketing ---
    window.mpacTransactionEnhancerState.analysisData = {
        gaps,
        lateRefunds
    };

    // --- Display Results ---
    // This logic is now self-contained and defensive.
    const displayContainer = document.getElementById('transaction-sum-container');
    if (displayContainer) {
        let resultsContainer = document.getElementById('gap-analysis-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'gap-analysis-results';
            resultsContainer.style.marginTop = '10px';
            displayContainer.appendChild(resultsContainer);
        }

        let html = '';
        if (gaps.length > 0) {
            html += '<h3>Maintenance Gaps Found:</h3><ul>';
            gaps.forEach(gap => {
                const gapId = getGapId(gap);
                const isTicketed = ticketedIds.has(gapId);
                html += `<li>Gap from ${gap.start} to ${gap.end} (${gap.days} days) ${isTicketed ? '<span style="color: #006644; font-weight: bold;">(Ticketed)</span>' : ''}</li>`;
            });
            html += '</ul>';
        }

        if (lateRefunds.length > 0) {
            html += '<h3>Late Refunds (> 30 days):</h3><ul>';
            lateRefunds.forEach(item => {
                const refundId = getLateRefundId(item);
                const isTicketed = ticketedIds.has(refundId);
                html += `<li>Refund on ${item.refund.saleDate.toISOString().split('T')[0]} for a transaction from ${item.originalTx.saleDate.toISOString().split('T')[0]} (${item.days} days later). Period: ${item.refund.periodStr} ${isTicketed ? '<span style="color: #006644; font-weight: bold;">(Ticketed)</span>' : ''}</li>`;
            });
            html += '</ul>';
        }

        if (html === '') {
            resultsContainer.innerHTML = '<p>No maintenance gaps or late refunds found.</p>';
        } else {
            resultsContainer.innerHTML = html;
        }
    } else {
        console.error("Cannot display analysis results: main container 'transaction-sum-container' not found.");
    }

    // --- Enhanced Relationship Tracking ---
    if (aen) {
        await updateTransactionRelationships(aen, transactions, gaps, lateRefunds);
    } else {
        // No AEN available, but still update Order ID status mapping directly
        console.log(`analyzeMaintenancePeriods: No AEN found, updating Order ID statuses directly`);
        await updateOrderIdStatusesDirectly(transactions, gaps, lateRefunds);
    }
    
    // Apply visuals immediately after analysis
    await applyProcessedVisuals();
}

async function fileSupportTicket(isAutomated = false) {
  const aenElement = document.querySelector('[data-testid="app-entitlement-number"] a');
  const aen = aenElement ? aenElement.textContent.trim() : '';

  // Get structured analysis data from global state
  const analysisData = window.mpacTransactionEnhancerState.analysisData;

  if (!aen) {
    if (isAutomated) {
        console.error('Could not find App Entitlement Number (AEN) on the page.');
    } else {
        alert('Could not find App Entitlement Number (AEN) on the page.');
    }
    return;
  }

  if (!analysisData || (analysisData.gaps.length === 0 && analysisData.lateRefunds.length === 0)) {
    if (isAutomated) {
        console.log('No analysis data found. Please run the analysis first.');
    } else {
        alert('No analysis data found. Please run the analysis first.');
    }
    return;
  }

  const { gaps, lateRefunds } = analysisData;
  const ticketedItemsStorageKey = `ticketedItems_${aen}`;
  
  try {
    const storedData = (await storageGet(ticketedItemsStorageKey))[ticketedItemsStorageKey];
    const ticketedIds = new Set(storedData || []);

    const newGaps = gaps.filter(gap => !ticketedIds.has(getGapId(gap)));
    const newLateRefunds = lateRefunds.filter(item => !ticketedIds.has(getLateRefundId(item)));

    if (newGaps.length === 0 && newLateRefunds.length === 0) {
      if (isAutomated) {
          console.log('No new issues found to file a ticket for.');
      } else {
          alert('No new issues found to file a ticket for.');
      }
      return;
    }

    let description = `Context:\n- App Entitlement Number (AEN): ${aen}\n\n`;
    const newTicketedIds = [];

    if (newGaps.length > 0) {
      description += 'New Maintenance Gaps Found:\n';
      description += '-----------------\n';
      newGaps.forEach(gap => {
        description += `Gap from ${gap.start} to ${gap.end} (${gap.days} days)\n`;
        newTicketedIds.push(getGapId(gap));
      });
      description += '-----------------\n';
      description += 'Please explain why the customer got our application for free during this period\n\n';
    }

    if (newLateRefunds.length > 0) {
      description += 'New Late Refunds (> 30 days):\n';
      description += '-----------------\n';
      newLateRefunds.forEach(item => {
        description += `Refund on ${item.refund.saleDate.toISOString().split('T')[0]} for a transaction from ${item.originalTx.saleDate.toISOString().split('T')[0]} (${item.days} days later). Period: ${item.refund.periodStr}\n`;
        newTicketedIds.push(getLateRefundId(item));
      });
      description += '-----------------\n';
      description += 'Please explain why this customer received refunds outside of the 30 day period without first getting approval from us.\n\n';
    }

    const supportData = {
      aen: aen,
      summary: `Review required for AEN: ${aen}`,
      description: description.trim()
    };

    // Set data for the support page to read
    await storageSet({ supportTicketData: supportData });
    
    // Open the support page
    window.open('https://support.atlassian.com/contact/#/', '_blank');

    // Update the list of ticketed items
    const updatedTicketedIds = [...ticketedIds, ...newTicketedIds];
    await storageSet({ [ticketedItemsStorageKey]: updatedTicketedIds });
    
    console.log('Updated ticketed items for AEN:', aen);

    // Re-run analysis to update the UI with the new "(Ticketed)" status
    await analyzeMaintenancePeriods();

  } catch (error) {
    console.error("Error during fileSupportTicket:", error);
    if (!isAutomated) {
        alert("An error occurred while filing the support ticket. Check the console for details.");
    }
  }
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

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .button-group {
      display: inline-flex;
      align-items: center;
    }
    #process-button {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    #dropdown-button {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left: 1px solid #ccc;
    }
    .dropdown {
      position: relative;
      display: inline-block;
    }
    .dropdown-content {
      display: none;
      position: absolute;
      background-color: #f9f9f9;
      min-width: 200px;
      box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
      z-index: 1000;
      right: 0;
      border-radius: 3px;
    }
    .dropdown-content a {
      color: black;
      padding: 8px 12px;
      text-decoration: none;
      display: block;
      font-size: 14px;
    }
    .dropdown-content a:hover {
      background-color: #ddd;
    }
    .mpac-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    }
    .mpac-modal-content {
      background-color: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .mpac-modal-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #4CAF50;
    }
    .mpac-modal-message {
      font-size: 16px;
      margin-bottom: 25px;
      color: #333;
      line-height: 1.4;
    }
    .mpac-modal-button {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    .mpac-modal-button:hover {
      background-color: #45a049;
    }
  `;
  document.head.appendChild(style);
}

// Renamed from processAll, this is the main worker for a single AEN page.
async function runAnalysisAndTicketing(isAutomated = false) {
    console.log(`🚀 Starting full analysis and ticketing process... (Automated: ${isAutomated})`);
    console.log(`🌐 Current URL: ${location.href}`);

    try {
        // The table structure might be ready, but the data rows are loaded asynchronously.
        // We must wait for them to appear before we can process them.
        console.log("⏳ Waiting for transaction rows to load...");
        await waitForRows();
        console.log("✅ Transaction rows found, proceeding...");

        // Now that rows are present, process the table to add our controls and attributes.
        console.log('🔧 Processing table with enhancements...');
        processTable();
        console.log('✅ Table processing complete.');

        // 1. Expand all rows so we can access the details needed for analysis.
        console.log('🔍 Expanding all rows...');
        await expandAllRowsWithWait();
        console.log('✅ Row expansion complete.');

        // 2. Run analysis on the now-visible data.
        console.log('📊 Running maintenance period analysis...');
        await analyzeMaintenancePeriods();
        console.log('✅ Analysis complete.');

        // 3. File support ticket if needed
        const analysisData = window.mpacTransactionEnhancerState.analysisData;
        if (analysisData && (analysisData.gaps.length > 0 || analysisData.lateRefunds.length > 0)) {
            console.log('🎫 Issues found, filing support ticket...');
            await fileSupportTicket(isAutomated);
            if (isAutomated) {
                // Give time for the support tab to open before we close this one.
                console.log('⏳ Waiting for support tab to open...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } else {
            console.log('✅ No issues found, skipping support ticket creation.');
            if (!isAutomated) {
                alert('Analysis complete. No maintenance gaps or late refunds found.');
            }
        }

        // 4. Signal completion ONLY if part of an automated flow
        if (isAutomated) {
            console.log('🏁 Analysis complete for this tab. Signaling completion...');
            await storageSet({ activeRefundJob: null }); // Signal completion by clearing the job
            console.log('💾 Storage updated. Tab will remain open for inspection.');
            
            // Add a visual indicator that processing is complete
            document.title = '✅ Analysis Complete - ' + document.title;
            
            // Add completion indicator to the page
            const completionBanner = document.createElement('div');
            completionBanner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #4CAF50;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                z-index: 10000;
                border-bottom: 3px solid #45a049;
            `;
            completionBanner.textContent = '✅ Automated Analysis Complete - Check results below';
            document.body.prepend(completionBanner);
        }
    } catch (error) {
        console.error('❌ Error during automated analysis and ticketing:', error);
        console.error('📍 Error stack:', error.stack);
        
        if (isAutomated) {
            // Still need to signal completion even on error to prevent hanging
            console.log('⚠️ Signaling completion due to error...');
            await storageSet({ activeRefundJob: null });
            console.log('💾 Error completion signaled. Tab will remain open for debugging.');
            
            // Add error indicator to the page
            document.title = '❌ Analysis Error - ' + document.title;
            
            const errorBanner = document.createElement('div');
            errorBanner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #f44336;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                z-index: 10000;
                border-bottom: 3px solid #d32f2f;
            `;
            errorBanner.textContent = '❌ Automated Analysis Error - Check console for details';
            document.body.prepend(errorBanner);
        } else {
            alert('An error occurred during analysis. Check the console for details.');
        }
    }
}


// This is the entry point when the user clicks "Process" on the main refund list.
async function processRefundsSequentially() {
    console.log('🚀 Starting sequential refund processing...');

    // First check if there's already processing happening
    const data = await storageGet(['refundQueue', 'activeRefundJob', 'totalRefundsToProcess']);
    const queue = data.refundQueue || [];
    const activeJob = data.activeRefundJob;
    const totalRefunds = data.totalRefundsToProcess || 0;

    // If there's already an active job or queue, don't start new processing
    if (activeJob || queue.length > 0 || totalRefunds > 0) {
        showModal('Processing Already Active', 'Refund processing is already in progress. Use the button controls to continue or reset the processing state.');
        return;
    }

    const transactionRows = document.querySelectorAll('div[data-mpac-row-id]');
    const unprocessedRows = [];

    transactionRows.forEach(row => {
        const statusIndicator = row.querySelector('.status-indicator');
        // We want to process rows that do NOT have a status indicator.
        if (!statusIndicator) {
            unprocessedRows.push(row);
        }
    });

    if (unprocessedRows.length === 0) {
        showModal('No Unprocessed Refunds', 'No unprocessed refunds found to process. All visible refunds appear to have been analyzed already.');
        return;
    }

    console.log(`📋 Found ${unprocessedRows.length} unprocessed rows`);

    // Expand rows to ensure the AEN link is available in the DOM
    for (const row of unprocessedRows) {
        const isExpanded = row.getAttribute('aria-expanded') === 'true';
        if (!isExpanded) {
            const expandButton = row.querySelector('[role="gridcell"]:first-child button');
            if (expandButton) {
                expandButton.click();
            }
        }
    }

    // Wait a moment for the expansion to render the details
    console.log('⏳ Waiting for row expansion...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const urlsToProcess = [];
    for (const row of unprocessedRows) {
        // The AEN link is in the row's details, which is the next sibling element.
        const aenLinkElement = row.nextElementSibling?.querySelector('[data-testid="aen-transactions-link"] a');
        if (aenLinkElement && aenLinkElement.href) {
            urlsToProcess.push(aenLinkElement.href);
        } else {
            console.warn('⚠️ Could not find AEN transaction link for row:', row);
        }
    }

    if (urlsToProcess.length > 0) {
        // 🔥 LIMIT TO FIRST 5 FOR TESTING
        const limitedUrls = urlsToProcess.slice(0, 5);
        console.log(`📊 Found ${urlsToProcess.length} refunds total, limiting to first ${limitedUrls.length} for testing:`, limitedUrls);
        
        await storageSet({ 
            refundQueue: limitedUrls,
            totalRefundsToProcess: limitedUrls.length,
            processedRefundsCount: 0
        });
        
        // Update the Process button to show current status and enable manual continuation
        updateProcessButtonForManualMode();
        
        // Start the first one
        processNextInQueue();
    } else {
        alert('Found unprocessed rows, but could not extract any AEN transaction links. Make sure rows are expanded.');
    }
}

async function processNextInQueue() {
    console.log('🔄 processNextInQueue: Starting...');
    
    const data = await storageGet(['refundQueue', 'activeRefundJob', 'totalRefundsToProcess', 'processedRefundsCount']);
    const queue = data.refundQueue || [];
    const currentActiveJob = data.activeRefundJob;
    const totalRefunds = data.totalRefundsToProcess || 0;
    const processedCount = data.processedRefundsCount || 0;

    console.log('🔄 processNextInQueue: Current state:', {
        queueLength: queue.length,
        currentActiveJob: currentActiveJob,
        processedCount: processedCount,
        totalRefunds: totalRefunds
    });

    // Check if there's already an active job running
    if (currentActiveJob) {
        console.log('⏸️ There is already an active job running. Waiting for it to complete...');
        updateProcessButtonForManualMode(); // Update button to show status
        return;
    }

    if (queue.length === 0) {
        console.log('✅ Refund processing queue is empty. Process finished.');
        await storageSet({ 
            activeRefundJob: null, 
            refundQueue: [], 
            totalRefundsToProcess: 0, 
            processedRefundsCount: 0 
        });
        
        // Reset the process button
        const processButton = document.getElementById('process-button');
        if (processButton) {
            processButton.textContent = 'Process';
            processButton.style.backgroundColor = '';
            processButton.disabled = false;
        }
        
        showModal('Processing Complete', 'All refunds have been processed! Check the open tabs for results.');
        // Apply processed visuals to show any new checkmarks
        await applyProcessedVisuals();
        return;
    }

    const nextUrl = queue.shift();
    const newProcessedCount = processedCount + 1;
    
    console.log(`🚀 Processing ${newProcessedCount}/${totalRefunds}: ${nextUrl}`);
    console.log(`📋 Remaining queue length: ${queue.length}`);

    // Set the active job and update the remaining queue
    await storageSet({ 
        activeRefundJob: nextUrl, 
        refundQueue: queue,
        processedRefundsCount: newProcessedCount
    });
    console.log('💾 Storage updated with new active job');

    // Update the button to show current progress
    updateProcessButtonForManualMode();

    // Brief delay to ensure storage is updated before opening tab
    await new Promise(resolve => setTimeout(resolve, 100));

    // Open the next URL in a new tab. The content script in that tab will take over.
    console.log('🌐 Opening new tab for:', nextUrl);
    window.open(nextUrl, '_blank');
}

// Update the Process button to show current progress and allow manual continuation
async function updateProcessButtonForManualMode() {
    const processButton = document.getElementById('process-button');
    if (!processButton) return;

    const data = await storageGet(['refundQueue', 'activeRefundJob', 'totalRefundsToProcess', 'processedRefundsCount']);
    const queue = data.refundQueue || [];
    const activeJob = data.activeRefundJob;
    const totalRefunds = data.totalRefundsToProcess || 0;
    const processedCount = data.processedRefundsCount || 0;

    if (totalRefunds === 0) {
        // No processing active
        processButton.textContent = 'Process';
        processButton.style.backgroundColor = '';
        processButton.disabled = false;
        return;
    }

    if (activeJob) {
        // Currently processing
        processButton.textContent = `Processing ${processedCount}/${totalRefunds}... (Working)`;
        processButton.style.backgroundColor = '#ff9800';
        processButton.disabled = true;
    } else if (queue.length > 0) {
        // Ready for next item
        processButton.textContent = `Continue ${processedCount}/${totalRefunds} (${queue.length} remaining)`;
        processButton.style.backgroundColor = '#4CAF50';
        processButton.disabled = false;
        
        // Update the click handler to continue processing
        processButton.onclick = () => {
            processNextInQueue();
        };
    } else {
        // All done
        processButton.textContent = `Completed ${processedCount}/${totalRefunds}`;
        processButton.style.backgroundColor = '#2196F3';
        processButton.disabled = true;
    }
}

function toggleExpandCollapseAll() {
    const firstRow = document.querySelector('div[data-mpac-row-id][aria-expanded]');
    const shouldExpand = firstRow ? firstRow.getAttribute('aria-expanded') !== 'true' : true;

    const rows = document.querySelectorAll('div[data-mpac-row-id]');
    rows.forEach(row => {
        const expandButton = row.querySelector('[role="gridcell"]:first-child button');
        const isExpanded = row.getAttribute('aria-expanded') === 'true';

        if (expandButton) {
            if (shouldExpand && !isExpanded) {
                expandButton.click();
            } else if (!shouldExpand && isExpanded) {
                expandButton.click();
            }
        }
    });
}

function expandAllRows() {
    // Look for all rows in the table, not just ones with our custom attribute
    const rowGroup = document.querySelector('[role="rowgroup"]');
    if (!rowGroup) {
        console.log('expandAllRows: No rowgroup found');
        return;
    }
    
    const rows = rowGroup.querySelectorAll('[role="row"]');
    console.log(`expandAllRows: Found ${rows.length} rows to potentially expand`);
    
    let expandedCount = 0;
    rows.forEach((row, index) => {
        const expandButton = row.querySelector('[role="gridcell"]:first-child button');
        const isExpanded = row.getAttribute('aria-expanded') === 'true';

        if (expandButton && !isExpanded) {
            console.log(`expandAllRows: Expanding row ${index + 1}`);
            expandButton.click();
            expandedCount++;
        } else if (!expandButton) {
            console.log(`expandAllRows: Row ${index + 1} has no expand button`);
        } else {
            console.log(`expandAllRows: Row ${index + 1} already expanded`);
        }
    });
    
    console.log(`expandAllRows: Expanded ${expandedCount} rows`);
}

async function expandAllRowsWithWait() {
    console.log('expandAllRowsWithWait: Starting row expansion...');
    
    // First, expand all rows
    expandAllRows();
    
    // Now wait for the details to load by checking for the presence of maintenance period data
    const maxWaitTime = 10000; // 10 seconds max wait
    const checkInterval = 500; // Check every 500ms
    let waitTime = 0;
    
    while (waitTime < maxWaitTime) {
        const rowGroup = document.querySelector('[role="rowgroup"]');
        if (!rowGroup) {
            console.log('expandAllRowsWithWait: No rowgroup found, breaking wait');
            break;
        }
        
        const rows = rowGroup.querySelectorAll('[role="row"]');
        let allRowsHaveDetails = true;
        let detailsFoundCount = 0;
        
        for (const row of rows) {
            const isExpanded = row.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                // Check if this row has the details loaded
                const detailsMain = row.nextElementSibling?.querySelector('main.css-1gxi3n2-Main');
                if (detailsMain) {
                    const detailPairs = detailsMain.querySelectorAll('.css-1bh2dbg-EachPair');
                    if (detailPairs.length > 0) {
                        detailsFoundCount++;
                    } else {
                        allRowsHaveDetails = false;
                    }
                } else {
                    allRowsHaveDetails = false;
                }
            }
        }
        
        console.log(`expandAllRowsWithWait: Found details for ${detailsFoundCount} rows, waiting for all to load...`);
        
        if (allRowsHaveDetails && detailsFoundCount > 0) {
            console.log('expandAllRowsWithWait: All expanded rows have details loaded');
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
    }
    
    if (waitTime >= maxWaitTime) {
        console.log('expandAllRowsWithWait: Timeout reached, proceeding anyway');
    } else {
        console.log(`expandAllRowsWithWait: Row expansion complete after ${waitTime}ms`);
    }
}

// Process the table
function processTable() {
  nextRowIdCounter = 0; // Reset for each full processing run
  const table = document.querySelector('[role="treegrid"]');
  if (!table) return;

  console.log('Processing table with transaction enhancements...');

  // Clean up any existing enhancements first
  cleanupExistingEnhancements();

  // Create sum display and attach event listeners immediately
  const sumContainer = createSumDisplay();
  const processButton = sumContainer.querySelector('#process-button');
  if (processButton) {
      if (location.href.includes('saleType=refund')) {
          processButton.addEventListener('click', processRefundsSequentially);
      } else {
          processButton.addEventListener('click', () => runAnalysisAndTicketing(false));
      }
  }
  const expandCollapseButton = sumContainer.querySelector('#expand-collapse-all-dropdown');
  if (expandCollapseButton) {
      expandCollapseButton.addEventListener('click', (e) => { e.preventDefault(); toggleExpandCollapseAll(); });
  }
  const analyzeButton = sumContainer.querySelector('#analyze-button-dropdown');
  if (analyzeButton) {
      analyzeButton.addEventListener('click', (e) => { e.preventDefault(); analyzeMaintenancePeriods(); });
  }
  const fileSupportTicketButton = sumContainer.querySelector('#file-support-ticket-button-dropdown');
  if (fileSupportTicketButton) {
    fileSupportTicketButton.addEventListener('click', (e) => { e.preventDefault(); fileSupportTicket(); });
  }
  const resetProcessingStateButton = sumContainer.querySelector('#reset-processing-state-dropdown');
  if (resetProcessingStateButton) {
    resetProcessingStateButton.addEventListener('click', (e) => { e.preventDefault(); resetProcessingState(); });
  }
  const resetHistoryPageRecordsButton = sumContainer.querySelector('#reset-history-page-records-dropdown');
  if (resetHistoryPageRecordsButton) {
    resetHistoryPageRecordsButton.addEventListener('click', (e) => { e.preventDefault(); resetHistoryForPageRecords(); });
  }
  const dropdownButton = sumContainer.querySelector('#dropdown-button');
  const dropdownContent = sumContainer.querySelector('#dropdown-content');
  if (dropdownButton) {
      dropdownButton.addEventListener('click', () => {
          dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
      });
  }
  document.addEventListener('click', (event) => {
      if (dropdownButton && dropdownContent && !dropdownButton.contains(event.target) && !dropdownContent.contains(event.target)) {
          dropdownContent.style.display = 'none';
      }
  });

  // Find header row and add checkbox header
  const headerRow = table.querySelector('[role="row"]');
  if (headerRow) {
    addCheckboxHeader(headerRow);
  }

  // Find all data rows and process them
  const rowGroup = table.querySelector('[role="rowgroup"]');
  if (rowGroup) {
      const dataRows = rowGroup.querySelectorAll('[role="row"]');
      dataRows.forEach(row => {
        const cells = row.querySelectorAll('[role="gridcell"]');
        const netAmountCell = cells[cells.length - 1];
        if (netAmountCell) {
          const amountText = netAmountCell.textContent.trim();
          const netAmount = parseNetAmount(amountText);
          addCheckboxToRow(row, netAmount);
        }
      });
  }

  // Final UI updates
  updateSelectAllHeaderState();
  updateSum();
  addTransactionLinks();
  applyProcessedVisuals();
  
  // Check for relationship changes and show notifications
  showRelationshipChangeNotifications();

  // Mark initial processing as done
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
  injectStyles();
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
      
      // Check if this was an automated job and run the analysis
      if (window.mpacTransactionEnhancerState.isAutomatedJob) {
          console.log('Automated job detected, running analysis and ticketing.');
          window.mpacTransactionEnhancerState.isAutomatedJob = false; // Prevent re-running
          runAnalysisAndTicketing(true);
      }

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
// This function will check if the current tab is part of the automated refund processing flow.
async function checkForAutomatedJob() {
    console.log('🔍 checkForAutomatedJob: Starting job detection...');
    console.log('🔍 checkForAutomatedJob: Current URL:', location.href);
    
    const data = await storageGet(['activeRefundJob', 'refundQueue']);
    const activeJobUrl = data.activeRefundJob;
    const queue = data.refundQueue || [];

    console.log('🔍 checkForAutomatedJob: Storage data:', { activeJobUrl, queueLength: queue.length });

    // If there's an active job, check if it matches this URL (handle both relative and absolute URLs)
    if (activeJobUrl) {
        const currentUrl = location.href;
        const currentPath = location.pathname + location.search;
        
        console.log('🔍 checkForAutomatedJob: URL comparison:');
        console.log('  - Current URL:', currentUrl);
        console.log('  - Current Path:', currentPath);
        console.log('  - Active Job URL:', activeJobUrl);
        
        // Check if the stored URL matches either the full URL or just the path+query
        const isMatch = (currentUrl === activeJobUrl) || 
                       (currentPath === activeJobUrl) ||
                       (currentUrl.endsWith(activeJobUrl));
        
        console.log('🔍 checkForAutomatedJob: URL match result:', isMatch);
        
        if (isMatch) {
            console.log('✅ This tab is an AUTOMATED refund processing job. Flagging for automation.');
            window.mpacTransactionEnhancerState.isAutomatedJob = true;
            
            // Instead of going through normal init, directly trigger automated processing
            console.log('🤖 Starting DIRECT automated processing...');
            await runAutomatedProcessingDirectly();
            return; // Don't call init() or set up storage listeners
        } else {
            console.log('ℹ️ Not an automated job - URLs do not match.');
            window.mpacTransactionEnhancerState.isAutomatedJob = false;
        }
    } else {
        console.log('ℹ️ No active job URL found in storage. This is a manual session.');
        window.mpacTransactionEnhancerState.isAutomatedJob = false;
    }
    
    console.log('🔍 checkForAutomatedJob: Final automation flag:', window.mpacTransactionEnhancerState.isAutomatedJob);
    
    // For non-automated tabs, proceed with normal initialization
    init();

    // This listener is for the *original* tab, to kick off the next job.
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.activeRefundJob) {
            // If activeRefundJob was cleared, it means a tab finished its work.
            if (changes.activeRefundJob.oldValue && !changes.activeRefundJob.newValue) {
                console.log('🔄 Detected completion of an active job. Processing next in queue.');
                // We must ensure we are on the original page, not the one that just closed.
                // A simple way is to check if a queue exists. The worker tabs won't have the full queue context.
                // A better check is to see if the "Process" button exists.
                if (document.getElementById('process-button')) {
                   processNextInQueue();
                } else {
                   console.log('🔄 Not on original page (no process button), ignoring completion signal.');
                }
            }
        }
    });
}

// Dedicated function for automated processing that bypasses normal init
async function runAutomatedProcessingDirectly() {
    console.log('🤖 runAutomatedProcessingDirectly: Starting...');
    console.log('🤖 Current URL:', location.href);
    console.log('🤖 Document ready state:', document.readyState);
    
    try {
        // Inject styles first
        injectStyles();
        
        // Add immediate visual indicator
        document.title = '🤖 Automated Processing... - ' + document.title;
        
        const processingBanner = document.createElement('div');
        processingBanner.id = 'automated-processing-banner';
        processingBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff9800;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
            z-index: 10000;
            border-bottom: 3px solid #f57c00;
        `;
        processingBanner.textContent = '🤖 Automated Processing in Progress...';
        document.body.prepend(processingBanner);
        
        // Wait for the table and rows to load with more detailed logging
        console.log('🤖 Step 1: Waiting for table...');
        await waitForTable();
        console.log('🤖 Step 1 Complete: Table found');
        
        console.log('🤖 Step 2: Waiting for rows...');
        await waitForRows();
        console.log('🤖 Step 2 Complete: Rows found');
        
        // Update banner
        processingBanner.textContent = '🤖 Processing table and expanding rows...';
        
        // Give a bit more time for the page to fully render
        console.log('🤖 Step 3: Waiting 3 seconds for page to fully stabilize...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('🤖 Step 3 Complete: Page stabilized');
        
        // Update banner
        processingBanner.textContent = '🤖 Processing table and setting up infrastructure...';
        
        // First, we need to process the table to set up our infrastructure
        console.log('🤖 Step 4: Processing table...');
        processTable();
        console.log('🤖 Step 4 Complete: Table processed');
        
        // Update banner
        processingBanner.textContent = '🤖 Running analysis and creating tickets...';
        
        // Now run the full analysis
        console.log('🤖 Step 5: Starting analysis and ticketing...');
        await runAnalysisAndTicketing(true);
        console.log('🤖 Step 5 Complete: Analysis finished');
        
        // Update banner with final results
        const analysisData = window.mpacTransactionEnhancerState.analysisData;
        let resultMessage = '✅ Analysis Complete';
        if (analysisData) {
            const totalIssues = (analysisData.gaps?.length || 0) + (analysisData.lateRefunds?.length || 0);
            if (totalIssues > 0) {
                resultMessage = `⚠️ Analysis Complete: ${totalIssues} issue${totalIssues > 1 ? 's' : ''} found and processed`;
                processingBanner.style.background = '#ff9800';
                processingBanner.style.borderBottomColor = '#f57c00';
            } else {
                resultMessage = '✅ Analysis Complete: No issues found';
                processingBanner.style.background = '#4CAF50';
                processingBanner.style.borderBottomColor = '#45a049';
            }
        }
        processingBanner.textContent = resultMessage;
        
    } catch (error) {
        console.error('🤖 ERROR in automated processing:', error);
        console.error('🤖 ERROR stack:', error.stack);
        
        // Add error indicator
        document.title = '❌ Automated Error - ' + document.title;
        
        // Remove processing banner
        const banner = document.getElementById('automated-processing-banner');
        if (banner) banner.remove();
        
        const errorBanner = document.createElement('div');
        errorBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f44336;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
            z-index: 10000;
            border-bottom: 3px solid #d32f2f;
        `;
        errorBanner.textContent = '❌ Automated Processing Error - Check console for details';
        document.body.prepend(errorBanner);
        
        // Still signal completion to prevent hanging
        await storageSet({ activeRefundJob: null });
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
    window.mpacTransactionEnhancerState.analysisData = null;
  }
  
  // Check if this tab should be running an automated job or initializing normally.
  checkForAutomatedJob();
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
        window.mpacTransactionEnhancerState.analysisData = null;
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

async function resetProcessingState() {
  try {
    // Clear all processing-related storage
    await storageSet({
      activeRefundJob: null,
      refundQueue: [],
      totalRefundsToProcess: 0,
      processedRefundsCount: 0
    });
    
    console.log('Processing state has been reset');
    
    // Reset the process button to normal state
    const processButton = document.getElementById('process-button');
    if (processButton) {
      processButton.textContent = 'Process';
      processButton.style.backgroundColor = '';
      processButton.disabled = false;
      
      // Reset the click handler to the appropriate function
      processButton.onclick = null;
      if (location.href.includes('saleType=refund')) {
        processButton.addEventListener('click', processRefundsSequentially);
      } else {
        processButton.addEventListener('click', () => runAnalysisAndTicketing(false));
      }
    }
    
    alert('Processing state has been reset. You can now start new processing.');
  } catch (error) {
    console.error('Error resetting processing state:', error);
    alert('Error resetting processing state. Check console for details.');
  }
}

async function resetHistoryForPageRecords() {
  try {
    console.log('resetHistoryForPageRecords: Starting reset for visible page records...');
    
    // Get all visible transaction rows on the current page
    const transactionRows = document.querySelectorAll('div[role="row"]');
    const orderIdsToReset = [];
    
    // Extract Order IDs from visible rows
    transactionRows.forEach(row => {
      const orderIdElement = row.querySelector('div.css-1dzhcs > div:nth-child(2) > span > span');
      if (orderIdElement) {
        const orderId = orderIdElement.textContent.trim();
        if (orderId) {
          orderIdsToReset.push(orderId);
        }
      }
    });
    
    if (orderIdsToReset.length === 0) {
      showModal('No Records Found', 'No transaction records found on this page to reset.');
      return;
    }
    
    console.log(`resetHistoryForPageRecords: Found ${orderIdsToReset.length} Order IDs to reset:`, orderIdsToReset);
    
    // Get current storage data
    const orderStatusKey = 'orderIdStatuses';
    const relationshipsKey = 'transactionRelationships';
    const data = await storageGet([orderStatusKey, relationshipsKey]);
    const orderStatuses = data[orderStatusKey] || {};
    const relationships = data[relationshipsKey] || {};
    
    // Count how many actually had status before reset
    let resetCount = 0;
    
    // Remove Order IDs from status mapping
    orderIdsToReset.forEach(orderId => {
      if (orderStatuses[orderId]) {
        delete orderStatuses[orderId];
        resetCount++;
      }
    });
    
    // Also clear from relationships data and ticketed items if AEN is available
    const aenElement = document.querySelector('[data-testid="app-entitlement-number"] a');
    const aen = aenElement ? aenElement.textContent.trim() : null;
    
    if (aen && relationships[aen]) {
      const aenData = relationships[aen];
      
      // Remove from processed order IDs
      aenData.processedOrderIds = aenData.processedOrderIds.filter(
        orderId => !orderIdsToReset.includes(orderId)
      );
      
      // Update periods to remove these order IDs
      Object.keys(aenData.periods).forEach(periodKey => {
        const period = aenData.periods[periodKey];
        period.renewals = period.renewals.filter(orderId => !orderIdsToReset.includes(orderId));
        period.refunds = period.refunds.filter(orderId => !orderIdsToReset.includes(orderId));
        
        // If period has no transactions left, we can remove it entirely
        if (period.renewals.length === 0 && period.refunds.length === 0) {
          delete aenData.periods[periodKey];
        }
      });
      
      console.log(`resetHistoryForPageRecords: Updated relationships for AEN ${aen}`);
    }
    
    // Clear ticketed items for this AEN since we're resetting the history
    // This ensures that any gaps or late refunds related to the reset transactions
    // will also have their ticketed status cleared
    if (aen) {
      const ticketedItemsStorageKey = `ticketedItems_${aen}`;
      const ticketedData = await storageGet(ticketedItemsStorageKey);
      const currentTicketedItems = ticketedData[ticketedItemsStorageKey] || [];
      
      if (currentTicketedItems.length > 0) {
        // Clear all ticketed items for this AEN since we're doing a page reset
        await storageSet({ [ticketedItemsStorageKey]: [] });
        console.log(`resetHistoryForPageRecords: Cleared ${currentTicketedItems.length} ticketed items for AEN ${aen}`);
      }
    }
    
    // Save updated storage
    await storageSet({ 
      [orderStatusKey]: orderStatuses,
      [relationshipsKey]: relationships
    });
    
    console.log(`resetHistoryForPageRecords: Removed ${resetCount} Order ID statuses from storage`);
    
    // Remove visual status indicators from the page
    transactionRows.forEach(row => {
      const statusIndicator = row.querySelector('.status-indicator');
      if (statusIndicator) {
        statusIndicator.remove();
      }
    });
    
    // Clear any analysis results display since it may no longer be accurate
    const resultsContainer = document.getElementById('gap-analysis-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    
    showModal(
      'History Reset Complete', 
      `Successfully reset processing history for ${orderIdsToReset.length} records on this page. ${resetCount} records had previous status that was cleared.`
    );
    
    console.log('resetHistoryForPageRecords: Reset completed successfully');
    
  } catch (error) {
    console.error('Error resetting history for page records:', error);
    showModal('Reset Error', 'An error occurred while resetting history. Check the console for details.');
  }
}

// --- Enhanced Relationship Tracking Functions ---

// Get period key from maintenance period string
function getPeriodKey(periodStr) {
    if (!periodStr) return null;
    const [startStr, endStr] = periodStr.split(' to ');
    if (!startStr || !endStr) return null;
    return `${startStr}_to_${endStr}`;
}

// Update transaction relationships with current analysis
async function updateTransactionRelationships(aen, transactions, gaps, lateRefunds) {
    console.log(`updateTransactionRelationships: Processing AEN ${aen} with ${transactions.length} transactions`);
    
    // Get both storage systems
    const relationshipsKey = 'transactionRelationships';
    const orderStatusKey = 'orderIdStatuses';
    const data = await storageGet([relationshipsKey, orderStatusKey]);
    const relationships = data[relationshipsKey] || {};
    const orderStatuses = data[orderStatusKey] || {};
    
    if (!relationships[aen]) {
        relationships[aen] = {
            lastAnalysisDate: new Date().toISOString().split('T')[0],
            periods: {},
            processedOrderIds: []
        };
    }

    const aenData = relationships[aen];
    aenData.lastAnalysisDate = new Date().toISOString().split('T')[0];

    // Group transactions by period
    const periodGroups = {};
    transactions.forEach(tx => {
        const periodKey = getPeriodKey(tx.periodStr);
        if (periodKey) {
            if (!periodGroups[periodKey]) {
                periodGroups[periodKey] = { renewals: [], refunds: [], periodStr: tx.periodStr };
            }
            if (tx.saleType === 'refund') {
                periodGroups[periodKey].refunds.push(tx.orderId);
            } else {
                periodGroups[periodKey].renewals.push(tx.orderId);
            }
        }
    });

    // Detect changes and update status for each period
    for (const periodKey in periodGroups) {
        const currentGroup = periodGroups[periodKey];
        const existingPeriod = aenData.periods[periodKey];
        
        let status = 'clean'; // Default status
        
        // Check for issues
        const periodGaps = gaps.filter(gap => 
            gap.start >= currentGroup.periodStr.split(' to ')[0] && 
            gap.end <= currentGroup.periodStr.split(' to ')[1]
        );
        
        const periodLateRefunds = lateRefunds.filter(item => 
            getPeriodKey(item.refund.periodStr) === periodKey
        );

        if (periodGaps.length > 0 || periodLateRefunds.length > 0) {
            status = 'issues';
        }

        // Check for new transactions since last analysis
        if (existingPeriod) {
            const previousRenewals = new Set(existingPeriod.renewals);
            const previousRefunds = new Set(existingPeriod.refunds);
            const currentRenewals = new Set(currentGroup.renewals);
            const currentRefunds = new Set(currentGroup.refunds);

            const hasNewTransactions = 
                !setsEqual(previousRenewals, currentRenewals) ||
                !setsEqual(previousRefunds, currentRefunds);

            if (hasNewTransactions && existingPeriod.status === 'clean') {
                status = 'needs_reanalysis';
                console.log(`updateTransactionRelationships: Period ${periodKey} needs re-analysis due to new transactions`);
            }
        }

        // Update period data
        aenData.periods[periodKey] = {
            renewals: currentGroup.renewals,
            refunds: currentGroup.refunds,
            status: status,
            lastRefundDate: getLatestRefundDate(currentGroup.refunds, transactions),
            ticketIds: existingPeriod ? existingPeriod.ticketIds || [] : []
        };

        // Update Order ID status mapping for quick lookup
        const allOrderIdsInPeriod = [...currentGroup.renewals, ...currentGroup.refunds];
        allOrderIdsInPeriod.forEach(orderId => {
            if (orderId) {
                orderStatuses[orderId] = status;
            }
        });
    }

    // Update processed order IDs
    const allOrderIds = transactions.map(t => t.orderId).filter(Boolean);
    aenData.processedOrderIds = [...new Set([...aenData.processedOrderIds, ...allOrderIds])];

    // Save both storage systems
    await storageSet({ 
        [relationshipsKey]: relationships,
        [orderStatusKey]: orderStatuses
    });
    
    console.log(`updateTransactionRelationships: Updated relationships for AEN ${aen}:`, aenData);
    console.log(`updateTransactionRelationships: Updated ${Object.keys(orderStatuses).length} Order ID statuses`);
}

// Helper function to check if two sets are equal
function setsEqual(setA, setB) {
    if (setA.size !== setB.size) return false;
    for (const item of setA) {
        if (!setB.has(item)) return false;
    }
    return true;
}

// Helper function to get latest refund date
function getLatestRefundDate(refundOrderIds, transactions) {
    const refundDates = transactions
        .filter(t => t.saleType === 'refund' && refundOrderIds.includes(t.orderId))
        .map(t => t.saleDate)
        .sort((a, b) => b - a);
    
    return refundDates.length > 0 ? refundDates[0].toISOString().split('T')[0] : null;
}

// Detect relationship changes when loading a new page
async function detectRelationshipChanges(aen, currentTransactions) {
    if (!aen) return { changedOrderIds: [], notifications: [] };

    const relationshipsKey = 'transactionRelationships';
    const data = await storageGet(relationshipsKey);
    const relationships = data[relationshipsKey] || {};
    const aenData = relationships[aen];

    if (!aenData) {
        return { changedOrderIds: [], notifications: [] };
    }

    const currentOrderIds = new Set(currentTransactions.map(t => t.orderId).filter(Boolean));
    const previousOrderIds = new Set(aenData.processedOrderIds);
    
    const newOrderIds = [...currentOrderIds].filter(id => !previousOrderIds.has(id));
    const changedOrderIds = [];
    const notifications = [];

    if (newOrderIds.length > 0) {
        // Check if new transactions affect existing periods
        for (const tx of currentTransactions) {
            if (newOrderIds.includes(tx.orderId)) {
                const periodKey = getPeriodKey(tx.periodStr);
                if (periodKey && aenData.periods[periodKey]) {
                    const period = aenData.periods[periodKey];
                    if (period.status === 'clean') {
                        // Mark related transactions for re-analysis
                        period.renewals.forEach(id => changedOrderIds.push(id));
                        period.refunds.forEach(id => changedOrderIds.push(id));
                        
                        notifications.push(`New ${tx.saleType} found in period ${tx.periodStr} - related transactions need re-analysis`);
                    }
                }
            }
        }
    }

    return { changedOrderIds: [...new Set(changedOrderIds)], notifications };
}

// Add notification system for relationship changes
async function showRelationshipChangeNotifications() {
    const aenElement = document.querySelector('[data-testid="app-entitlement-number"] a');
    const aen = aenElement ? aenElement.textContent.trim() : null;
    
    if (!aen) return;

    // Get current transactions (simplified for notification check)
    const transactions = [];
    const transactionRows = document.querySelectorAll('div[role="row"]');
    
    transactionRows.forEach(row => {
        const orderIdElement = row.querySelector('div.css-1dzhcs > div:nth-child(2) > span > span');
        if (orderIdElement) {
            transactions.push({ orderId: orderIdElement.textContent.trim() });
        }
    });

    const { changedOrderIds, notifications } = await detectRelationshipChanges(aen, transactions);

    if (notifications.length > 0) {
        const notificationDiv = document.createElement('div');
        notificationDiv.id = 'relationship-notifications';
        notificationDiv.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            max-width: 400px;
            z-index: 9999;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        `;
        
        let html = '<h4 style="margin-top: 0; color: #856404;">⚠️ Transaction Changes Detected</h4>';
        notifications.forEach(msg => {
            html += `<p style="margin: 5px 0; color: #856404;">${msg}</p>`;
        });
        html += '<button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px; background: #ffc107; border: none; border-radius: 3px; cursor: pointer;">Dismiss</button>';
        
        notificationDiv.innerHTML = html;
        document.body.appendChild(notificationDiv);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notificationDiv.parentElement) {
                notificationDiv.remove();
            }
        }, 10000);
    }
}

// Update Order ID statuses directly when no AEN is available
async function updateOrderIdStatusesDirectly(transactions, gaps, lateRefunds) {
    console.log(`updateOrderIdStatusesDirectly: Processing ${transactions.length} transactions`);
    
    const orderStatusKey = 'orderIdStatuses';
    const data = await storageGet(orderStatusKey);
    const orderStatuses = data[orderStatusKey] || {};
    
    // Group transactions by period to detect issues
    const periodGroups = {};
    transactions.forEach(tx => {
        const periodKey = getPeriodKey(tx.periodStr);
        if (periodKey) {
            if (!periodGroups[periodKey]) {
                periodGroups[periodKey] = { renewals: [], refunds: [], periodStr: tx.periodStr };
            }
            if (tx.saleType === 'refund') {
                periodGroups[periodKey].refunds.push(tx.orderId);
            } else {
                periodGroups[periodKey].renewals.push(tx.orderId);
            }
        }
    });

    // Determine status for each period
    for (const periodKey in periodGroups) {
        const currentGroup = periodGroups[periodKey];
        let status = 'clean'; // Default status
        
        // Check for issues in this period
        const periodGaps = gaps.filter(gap => 
            gap.start >= currentGroup.periodStr.split(' to ')[0] && 
            gap.end <= currentGroup.periodStr.split(' to ')[1]
        );
        
        const periodLateRefunds = lateRefunds.filter(item => 
            getPeriodKey(item.refund.periodStr) === periodKey
        );

        if (periodGaps.length > 0 || periodLateRefunds.length > 0) {
            status = 'issues';
        }

        // Update Order ID status mapping for all transactions in this period
        const allOrderIdsInPeriod = [...currentGroup.renewals, ...currentGroup.refunds];
        allOrderIdsInPeriod.forEach(orderId => {
            if (orderId) {
                orderStatuses[orderId] = status;
            }
        });
    }

    // Save updated order statuses
    await storageSet({ [orderStatusKey]: orderStatuses });
    
    console.log(`updateOrderIdStatusesDirectly: Updated ${Object.keys(orderStatuses).length} Order ID statuses`);
}

// The URL rewriting is now handled within processTable, which is triggered
// on initial load and on any table changes. This avoids the need for
// a separate observer or timeouts for URL rewriting.
