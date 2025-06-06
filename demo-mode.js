// Demo Mode Controller for MPAC UI Enhancer
// Handles activation/deactivation of demo mode and DOM manipulation

class DemoModeController {
  constructor() {
    this.isActive = false;
    this.originalContent = null;
    this.currentScenario = null;
    this.demoDataInitialized = false;
  }

  // Initialize demo mode (call this when content script loads)
  async initialize() {
    console.log('Demo Mode Controller: Initializing...');
    
    // Load demo mode settings
    const settings = await this.loadDemoSettings();
    if (settings.enabled) {
      // Wait for table to be available before activating
      await this.waitForTable();
      await this.activateDemo(settings.scenario);
    }

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.demoModeSettings) {
        this.handleSettingsChange(changes.demoModeSettings.newValue);
      }
    });
  }

  // Load demo mode settings from storage
  async loadDemoSettings() {
    try {
      const data = await storageGet(['demoModeSettings']);
      return data.demoModeSettings || { enabled: false, scenario: 'clean' };
    } catch (error) {
      console.error('Error loading demo settings:', error);
      return { enabled: false, scenario: 'clean' };
    }
  }

  // Wait for the transaction table to be available (matches content.js pattern)
  async waitForTable() {
    return new Promise((resolve) => {
      const checkForTable = () => {
        const table = document.querySelector('[role="treegrid"]');
        if (table) {
          console.log('Demo Mode Controller: Table found');
          resolve(table);
        } else {
          setTimeout(checkForTable, 100);
        }
      };
      checkForTable();
    });
  }

  // Wait for data rows to appear in the table (matches content.js pattern)
  async waitForRows() {
    return new Promise((resolve) => {
      const checkForRows = () => {
        const rowGroup = document.querySelector('[role="rowgroup"]');
        const rows = rowGroup ? rowGroup.querySelectorAll('[role="row"]') : null;
        if (rows && rows.length > 0) {
          console.log(`Demo Mode Controller: Found ${rows.length} data rows.`);
          resolve(rows);
        } else {
          setTimeout(checkForRows, 100);
        }
      };
      checkForRows();
    });
  }

  // Expand first row to access AEN if needed (graceful approach)
  async expandFirstRowForAEN() {
    try {
      const firstRow = document.querySelector('[role="rowgroup"] [role="row"]:first-child');
      if (firstRow && firstRow.getAttribute('aria-expanded') !== 'true') {
        const expandButton = firstRow.querySelector('[role="gridcell"]:first-child button');
        if (expandButton) {
          console.log('Demo Mode Controller: Expanding first row to access AEN...');
          expandButton.click();
          // Wait a bit for the expansion to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Demo Mode Controller: Could not expand first row:', error);
      return false;
    }
  }

  // Handle settings changes from popup
  async handleSettingsChange(newSettings) {
    console.log('Demo Mode: Settings changed:', newSettings);
    
    if (newSettings.enabled && !this.isActive) {
      // Wait for table to be available before activating
      await this.waitForTable();
      await this.activateDemo(newSettings.scenario);
    } else if (!newSettings.enabled && this.isActive) {
      await this.deactivateDemo();
    } else if (this.isActive && newSettings.scenario !== this.currentScenario) {
      // Scenario changed while demo is active
      await this.switchScenario(newSettings.scenario);
    }
  }

  // Activate demo mode with specified scenario
  async activateDemo(scenario = 'clean') {
    if (this.isActive) {
      console.log('Demo Mode: Already active, switching scenario...');
      await this.switchScenario(scenario);
      return;
    }

    console.log(`Demo Mode: Activating with scenario "${scenario}"`);
    
    try {
      // Initialize demo data if needed
      if (!this.demoDataInitialized) {
        if (typeof initializeDemoData === 'function') {
          initializeDemoData();
          this.demoDataInitialized = true;
        } else {
          console.error('Demo Mode: Demo data not available');
          return;
        }
      }

      // Wait for table and rows to be fully loaded (matches content.js pattern)
      console.log('Demo Mode: Waiting for table structure...');
      await this.waitForTable();
      
      console.log('Demo Mode: Waiting for data rows...');
      await this.waitForRows();

      // Backup original content
      await this.backupOriginalContent();
      
      // Inject demo data
      await this.injectDemoData(scenario);
      
      // Add demo mode indicators
      this.addDemoModeIndicators(scenario);
      
      this.isActive = true;
      this.currentScenario = scenario;
      
      console.log('Demo Mode: Activated successfully');
      
      // Trigger extension to reprocess the new demo data
      if (typeof processTable === 'function') {
        setTimeout(() => {
          processTable();
        }, 100);
      }
      
    } catch (error) {
      console.error('Demo Mode: Error activating:', error);
      await this.deactivateDemo(); // Cleanup on error
    }
  }

  // Deactivate demo mode and restore original content
  async deactivateDemo() {
    if (!this.isActive) {
      console.log('Demo Mode: Not active, nothing to deactivate');
      return;
    }

    console.log('Demo Mode: Deactivating...');
    
    try {
      // Remove demo indicators
      this.removeDemoModeIndicators();
      
      // Restore original content
      await this.restoreOriginalContent();
      
      this.isActive = false;
      this.currentScenario = null;
      
      console.log('Demo Mode: Deactivated successfully');
      
      // Trigger extension to reprocess original data
      if (typeof processTable === 'function') {
        setTimeout(() => {
          processTable();
        }, 100);
      }
      
    } catch (error) {
      console.error('Demo Mode: Error deactivating:', error);
    }
  }

  // Switch to a different demo scenario
  async switchScenario(newScenario) {
    if (!this.isActive) {
      await this.activateDemo(newScenario);
      return;
    }

    console.log(`Demo Mode: Switching from "${this.currentScenario}" to "${newScenario}"`);
    
    // Remove current demo indicators
    this.removeDemoModeIndicators();
    
    // Inject new demo data
    await this.injectDemoData(newScenario);
    
    // Add new indicators
    this.addDemoModeIndicators(newScenario);
    
    this.currentScenario = newScenario;
    
    // Reprocess with new data
    if (typeof processTable === 'function') {
      setTimeout(() => {
        processTable();
      }, 100);
    }
  }

  // Backup original page content
  async backupOriginalContent() {
    const table = document.querySelector('[role="treegrid"]');
    const aenElement = document.querySelector('[data-testid="app-entitlement-number"]');
    
    if (!table) {
      throw new Error('Transaction table not found');
    }

    this.originalContent = {
      table: table.cloneNode(true),
      aen: aenElement ? aenElement.cloneNode(true) : null,
      pageTitle: document.title,
      url: window.location.href
    };
    
    console.log('Demo Mode: Original content backed up');
  }

  // Restore original page content
  async restoreOriginalContent() {
    if (!this.originalContent) {
      console.warn('Demo Mode: No original content to restore');
      return;
    }

    const currentTable = document.querySelector('[role="treegrid"]');
    const currentAen = document.querySelector('[data-testid="app-entitlement-number"]');
    
    if (currentTable && this.originalContent.table) {
      currentTable.parentNode.replaceChild(this.originalContent.table.cloneNode(true), currentTable);
    }
    
    if (currentAen && this.originalContent.aen) {
      currentAen.parentNode.replaceChild(this.originalContent.aen.cloneNode(true), currentAen);
    }

    // Restore page title
    document.title = this.originalContent.pageTitle;
    
    console.log('Demo Mode: Original content restored');
  }

  // Inject demo data into the page
  async injectDemoData(scenario) {
    if (!DEMO_SCENARIOS[scenario]) {
      throw new Error(`Unknown demo scenario: ${scenario}`);
    }

    const scenarioData = DEMO_SCENARIOS[scenario];
    console.log(`Demo Mode: Injecting data for scenario "${scenario}"`, scenarioData);

    // Update AEN
    await this.updateAEN(scenarioData.aen, scenarioData.company);
    
    // Update transaction table
    await this.updateTransactionTable(scenarioData.transactions);
    
    // Update page title
    document.title = `🎭 DEMO: ${scenarioData.name} - ${document.title}`;
  }

  // Update AEN element with demo data (graceful approach)
  async updateAEN(demoAen, demoCompany) {
    let aenElement = document.querySelector('[data-testid="app-entitlement-number"]');
    
    // If AEN element not found, try expanding first row to access it
    if (!aenElement) {
      console.log('Demo Mode: AEN element not immediately visible, trying to expand first row...');
      const expanded = await this.expandFirstRowForAEN();
      if (expanded) {
        // Wait a bit more and try again
        await new Promise(resolve => setTimeout(resolve, 200));
        aenElement = document.querySelector('[data-testid="app-entitlement-number"]');
      }
    }
    
    if (!aenElement) {
      console.warn('Demo Mode: AEN element not found even after expansion attempt - skipping AEN update (this is normal for some page types)');
      return;
    }

    const aenLink = aenElement.querySelector('a');
    if (aenLink) {
      aenLink.textContent = demoAen;
      // Update href to maintain functionality
      const originalHref = aenLink.getAttribute('href');
      if (originalHref) {
        // Replace the actual AEN in the URL with our demo AEN
        const newHref = originalHref.replace(/SEN-L\d+/, demoAen);
        aenLink.setAttribute('href', newHref);
      }
    }

    // Update company name if visible (graceful approach)
    const companyElements = document.querySelectorAll('h1, h2, h3, .company-name, [data-testid*="company"]');
    companyElements.forEach(el => {
      if (el.textContent && (el.textContent.includes('TechCorp') || el.textContent.includes('DataSync'))) {
        // Replace with demo company if it looks like a company name
        el.textContent = el.textContent.replace(/\b\w+\s*(Corp|Inc|Ltd|Solutions|Systems)\b/i, demoCompany);
      }
    });

    console.log(`Demo Mode: Updated AEN to ${demoAen} for ${demoCompany}`);
  }

  // Update transaction table with demo data
  async updateTransactionTable(transactions) {
    const table = document.querySelector('[role="treegrid"]');
    const rowGroup = table ? table.querySelector('[role="rowgroup"]') : null;
    
    if (!table || !rowGroup) {
      throw new Error('Transaction table structure not found');
    }

    // Clear existing rows
    rowGroup.innerHTML = '';

    // Add demo transaction rows
    transactions.forEach((transaction, index) => {
      const row = this.createTransactionRow(transaction, index);
      rowGroup.appendChild(row);
    });

    console.log(`Demo Mode: Added ${transactions.length} demo transactions to table`);
  }

  // Create a transaction row element with demo data
  createTransactionRow(transaction, index) {
    // Validate required fields
    const requiredFields = ['saleDate', 'orderId', 'customerName', 'appName', 'saleType', 'amount', 'maintenancePeriod'];
    for (const field of requiredFields) {
      if (transaction[field] === undefined || transaction[field] === null) {
        console.error(`Demo Mode: Missing required field '${field}' in transaction:`, transaction);
        throw new Error(`Missing required field '${field}' in transaction data`);
      }
    }

    // Create outer wrapper to match original structure
    const outerWrapper = document.createElement('div');
    outerWrapper.id = `table-item${index + 1}`;
    outerWrapper.setAttribute('aria-label', 'row');
    outerWrapper.className = 'css-ctsb87-StyledRow eswur9q2';
    
    // Create inner row
    const row = document.createElement('div');
    row.setAttribute('role', 'row');
    row.setAttribute('aria-expanded', 'false');
    row.className = 'css-1dzhcs';
    row.setAttribute('data-mpac-row-id', `mpac-row-${index}`);
    
    // Create grid cells matching the original table structure exactly
    const cells = [
      this.createSaleDateCell(transaction.saleDate, index),
      this.createOrderIdCell(transaction.orderId, index),
      this.createCustomerNameCell(transaction.customerName, index),
      this.createAppNameCell(transaction.appName, index),
      this.createSaleTypeCell(transaction.saleType),
      this.createNetAmountCell(transaction.amount, transaction.saleType),
      this.createCheckboxCell(transaction.amount)
    ];

    cells.forEach(cell => row.appendChild(cell));
    outerWrapper.appendChild(row);

    // Add details section (expanded content)
    const detailsSection = this.createDetailsSection(transaction);
    
    // Add expand button functionality
    const expandButton = row.querySelector('button');
    if (expandButton) {
      expandButton.addEventListener('click', () => {
        const isExpanded = row.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
          row.setAttribute('aria-expanded', 'false');
          if (detailsSection.parentNode) {
            detailsSection.remove();
          }
        } else {
          row.setAttribute('aria-expanded', 'true');
          outerWrapper.parentNode.insertBefore(detailsSection, outerWrapper.nextSibling);
        }
      });
    }

    return outerWrapper;
  }

  // Create individual cell elements matching original structure exactly
  createSaleDateCell(saleDate, index) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.className = 'css-i9zauw';
    cell.style.width = '136.36px';
    
    cell.innerHTML = `
      <span class="css-0">
        <span class="css-h60w7d">
          <button class=" css-lpuias" type="button">
            <span class=" css-1spmf3f">
              <span data-vc="icon-undefined" aria-hidden="true" class="css-snhnyn" style="--icon-primary-color: currentColor; --icon-secondary-color: var(--ds-surface, #FFFFFF);">
                <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
                  <path fill="currentcolor" fill-rule="evenodd" d="M10.294 9.698a.99.99 0 0 1 0-1.407 1.01 1.01 0 0 1 1.419 0l2.965 2.94a1.09 1.09 0 0 1 0 1.548l-2.955 2.93a1.01 1.01 0 0 1-1.42 0 .99.99 0 0 1 0-1.407l2.318-2.297z"></path>
                </svg>
              </span>
              <span class="css-b5o75w">Expand row item${index + 1}</span>
            </span>
          </button>
        </span>${saleDate}
      </span>
    `;
    
    return cell;
  }

  createOrderIdCell(orderId, index) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.className = 'css-i9zauw';
    cell.style.width = '175.32px';
    
    cell.innerHTML = `
      <span class="css-0">
        <span data-testid="transactionId-${index + 1}">${orderId}</span>
      </span>
    `;
    
    return cell;
  }

  createCustomerNameCell(customerName, index) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.className = 'css-i9zauw';
    cell.style.width = '214.28px';
    
    const encodedName = encodeURIComponent(customerName);
    
    cell.innerHTML = `
      <span class="css-0">
        <a data-testid="company-name-${index + 1}" href="/manage/vendors/1212980/reporting/transactions?excludeZeroTransactions=true&saleType=refund&text=${encodedName}&twoSV=true">${customerName}</a>
      </span>
    `;
    
    return cell;
  }

  createAppNameCell(appName, index) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.className = 'css-i9zauw';
    cell.style.width = '194.8px';
    
    // Create a simple addon key from app name for the URL
    const addonKey = appName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    cell.innerHTML = `
      <span class="css-0">
        <a href="/manage/vendors/1212980/reporting/transactions?addon=${addonKey}&excludeZeroTransactions=true&saleType=refund&twoSV=true">${appName}</a>
      </span>
    `;
    
    return cell;
  }

  createSaleTypeCell(saleType) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.className = 'css-i9zauw';
    cell.style.width = '116.88px';
    
    const displayType = saleType.charAt(0).toUpperCase() + saleType.slice(1);
    
    cell.innerHTML = `
      <span class="css-0">
        <span class="css-13x1l8e" style="max-width: 100%;">
          <span class="css-zaurrk" style="max-width: calc(200px - var(--ds-space-100, 8px));">${displayType}</span>
        </span>
      </span>
    `;
    
    return cell;
  }

  createNetAmountCell(amount, saleType) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.className = 'css-i9zauw';
    cell.style.width = '136.36px';
    
    const formattedAmount = saleType === 'refund' ? `-$${amount.toFixed(2)}` : `$${amount.toFixed(2)}`;
    
    cell.innerHTML = `
      <span class="css-0">
        <div class="css-ypu08p-TextRight eepy6cd0">${formattedAmount}</div>
      </span>
    `;
    
    return cell;
  }

  createCheckboxCell(amount) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.className = 'css-i9zauw checkbox-cell';
    cell.style.width = '60px';
    
    cell.innerHTML = `
      <div class="checkbox-container">
        <input type="checkbox" class="transaction-checkbox" data-net-amount="${amount}">
      </div>
    `;
    
    return cell;
  }

  // Generate a unique AEN for this transaction based on scenario AEN
  generateTransactionAen(scenarioAen, orderId) {
    // Create a unique AEN suffix from the order ID
    const orderSuffix = orderId.replace(/[^0-9]/g, '').slice(-3).padStart(3, '0');
    const baseAen = scenarioAen.slice(0, -3); // Remove last 3 digits
    return `${baseAen}${orderSuffix}`;
  }

  // Create details section for expanded row
  createDetailsSection(transaction) {
    const detailsSection = document.createElement('div');
    detailsSection.setAttribute('role', 'row');
    detailsSection.className = 'css-details-section';
    
    // Generate a demo AEN for this transaction (using scenario AEN as base)
    const scenarioAen = this.currentScenario ? DEMO_SCENARIOS[this.currentScenario].aen : 'SEN-L12345678';
    const transactionAen = this.generateTransactionAen(scenarioAen, transaction.orderId);
    
    detailsSection.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 16px; background-color: #f8f9fa; border-top: 1px solid #e4e6ea;">
        <main class="css-1gxi3n2-Main e94bvxz0">
          <div class="css-ncc4mn-DetailsLeftWrapper e94bvxz4">
            <div class="css-1bh2dbg-EachPair e94bvxz2">
              <p>Host entitlement number</p>
              <p class="css-euejxh-EntitlementWrapper e12ldkvh0">
                <a href="/manage/vendors/1212980/reporting/licenses?text=${scenarioAen}">${scenarioAen}</a>
              </p>
            </div>
            <div data-testid="app-entitlement-number" class="css-1bh2dbg-EachPair e94bvxz2">
              <p>App entitlement number</p>
              <p><a href="/manage/vendors/1212980/reporting/licenses?text=${transactionAen}">${transactionAen}</a></p>
            </div>
            <div class="css-1bh2dbg-EachPair e94bvxz2" data-testid="aen-transactions-link">
              <p>AEN Transactions Link</p>
              <p><a href="/manage/vendors/1212980/reporting/transactions?text=${transactionAen}">${transactionAen}</a></p>
            </div>
            <div class="css-1bh2dbg-EachPair e94bvxz2">
              <p>Contacts</p>
              <p><div><span>${transaction.customerName}</span><a href="mailto:demo@${transaction.customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com">(email)</a></div></p>
            </div>
            <div class="css-1bh2dbg-EachPair e94bvxz2">
              <p>Customer location</p>
              <p>Demo Location, DEMO</p>
            </div>
            <div class="css-1bh2dbg-EachPair e94bvxz2">
              <p>Hosting</p>
              <p>Cloud, Annual</p>
            </div>
            <div class="css-1bh2dbg-EachPair e94bvxz2">
              <p>Edition type</p>
              <p>${transaction.licenseType}</p>
            </div>
            <div class="css-1bh2dbg-EachPair e94bvxz2">
              <p>Tier</p>
              <p>${transaction.customerTier}</p>
            </div>
            <div class="css-1bh2dbg-EachPair e94bvxz2">
              <p>Maintenance period</p>
              <p>${transaction.maintenancePeriod}</p>
            </div>
          </div>
          <div class="css-13xnf75-DetailsRightWrapper e94bvxz5">
            <div class="css-1kw37hy-SummaryMainWrapper e94bvxz3">
              <div class="css-1bh2dbg-EachPair e94bvxz2">
                <div>Sale price</div> ${transaction.saleType === 'refund' ? '-' : ''}$${(transaction.amount * 1.15).toFixed(2)}
              </div>
              <div class="css-1bh2dbg-EachPair e94bvxz2">
                <div>Atlassian fee</div> ${transaction.saleType === 'refund' ? '-' : ''}$${(transaction.amount * 0.15).toFixed(2)}
              </div>
              <hr>
              <div class="css-1bh2dbg-EachPair e94bvxz2">
                <div class="css-x44p1j-NetRevenue e94bvxz6">Net revenue</div>
                <div class="css-x44p1j-NetRevenue e94bvxz6">${transaction.saleType === 'refund' ? '-' : ''}$${transaction.amount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
    
    return detailsSection;
  }

  // Add visual indicators that demo mode is active
  addDemoModeIndicators(scenario) {
    // Remove any existing indicators
    this.removeDemoModeIndicators();

    // Add demo mode banner
    const banner = document.createElement('div');
    banner.id = 'demo-mode-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ff6b6b, #ffa500);
      color: white;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      z-index: 10000;
      border-bottom: 3px solid #ff4757;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    const scenarioInfo = DEMO_SCENARIOS[scenario];
    banner.innerHTML = `
      🎭 DEMO MODE ACTIVE: ${scenarioInfo.name}
      <span style="font-weight: normal; margin-left: 10px; font-size: 0.9em;">
        ${scenarioInfo.description}
      </span>
    `;
    
    document.body.prepend(banner);

    // Add padding to body to account for banner
    document.body.style.paddingTop = '50px';

    // Add demo styling to the table
    const table = document.querySelector('[role="treegrid"]');
    if (table) {
      table.style.border = '3px solid #ff6b6b';
      table.style.borderRadius = '8px';
    }

    console.log(`Demo Mode: Added indicators for scenario "${scenario}"`);
  }

  // Remove demo mode visual indicators
  removeDemoModeIndicators() {
    const banner = document.getElementById('demo-mode-banner');
    if (banner) {
      banner.remove();
    }

    // Remove body padding
    document.body.style.paddingTop = '';

    // Remove demo styling from table
    const table = document.querySelector('[role="treegrid"]');
    if (table) {
      table.style.border = '';
      table.style.borderRadius = '';
    }

    console.log('Demo Mode: Removed indicators');
  }

  // Get current demo status
  getStatus() {
    return {
      isActive: this.isActive,
      scenario: this.currentScenario,
      hasBackup: this.originalContent !== null
    };
  }
}

// Initialize demo mode controller
let demoModeController = null;

// Initialize when the script loads
function initializeDemoMode() {
  if (!demoModeController) {
    demoModeController = new DemoModeController();
    demoModeController.initialize();
  }
  return demoModeController;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.DemoModeController = DemoModeController;
  window.initializeDemoMode = initializeDemoMode;
  window.demoModeController = null; // Will be set when initialized
}
