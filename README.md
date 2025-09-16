# Atlassian Marketplace Transaction Enhancer (MPAC UI Enhancer)

A comprehensive Chrome extension that transforms the Atlassian Marketplace vendor reporting experience with advanced analysis, automation, and management capabilities.

## Features Overview

### 🎯 Core Transaction Management
- ✅ **Interactive Checkboxes** - Select/deselect individual transactions with persistent state management
- ✅ **Smart Default States** - Configurable default selection behavior
- ✅ **Real-time Sum Calculation** - Automatic totaling of selected Net $ amounts
- ✅ **Select All Functionality** - Master checkbox with indeterminate state support
- ✅ **Responsive Design** - Works seamlessly on desktop and mobile layouts

### 🔍 Advanced Analysis & Automation
- ✅ **Maintenance Period Gap Analysis** - Detects coverage gaps in maintenance periods
- ✅ **Late Refund Detection** - Identifies refunds issued beyond configurable thresholds (default: 30 days)
- ✅ **Automated Support Ticket Creation** - Generates and submits tickets for identified issues
- ✅ **Sequential Refund Processing** - Batch process multiple AENs with progress tracking
- ✅ **Duplicate Ticket Prevention** - Intelligent tracking prevents duplicate support tickets
- ✅ **Relationship Change Detection** - Monitors and notifies of transaction relationship changes

### 🎛️ Process Management
- ✅ **Unified Process Button** - Single-click automation with dropdown for individual actions
- ✅ **Manual Process Continuation** - Resume interrupted batch processing operations
- ✅ **Progress Tracking** - Visual indicators for processing status and completion
- ✅ **Queue Management** - Advanced job queue system with error recovery
- ✅ **Status Indicators** - Visual markers for processed, clean, and problematic transactions

### 🔗 Enhanced Navigation
- ✅ **Entitlement URL Rewriting** - Automatically converts license URLs to transaction URLs
- ✅ **AEN Transaction Links** - Direct navigation links for App Entitlement Numbers
- ✅ **Smart URL Handling** - Configurable URL opening behavior (same tab/new tab)

### ⚙️ Comprehensive Settings System
- ✅ **Processing Controls** - Batch limits, thresholds, and automation preferences
- ✅ **Behavior Customization** - Default states, auto-analysis, and expansion settings
- ✅ **Tab Management** - Auto-close, tab limits, and cleanup automation
- ✅ **Notification System** - Configurable alerts and relationship change notifications
- ✅ **Debug Controls** - Advanced timing, retry, and stability parameters

### 🎭 Demo Mode System
- ✅ **Training Scenarios** - Four realistic demo scenarios for testing and training
- ✅ **Synthetic Data Generation** - Realistic transaction data with configurable issues
- ✅ **Visual Demo Indicators** - Clear identification when demo mode is active
- ✅ **Scenario Switching** - Easy switching between clean, gap, late refund, and mixed scenarios

### 🔒 Data Management
- ✅ **Processing History** - Tracks analyzed transactions and their status
- ✅ **State Persistence** - Maintains settings and progress across sessions
- ✅ **Reset Capabilities** - Clear processing history and reset states
- ✅ **Storage Optimization** - Efficient data storage and retrieval

## Installation

### Option 1: Load as Unpacked Extension (Developer Mode)

1. **Download the extension files**:
   - Clone or download all files to a folder on your computer
   - Required files: `manifest.json`, `content.js`, `popup.html`, `popup.js`, `styles.css`, `support.js`, `demo-mode.js`, `demo-data.js`

2. **Open Chrome Extensions page**:
   - Navigate to `chrome://extensions/` in your browser
   - Or go to Chrome menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**:
   - Click "Load unpacked" button
   - Select the folder containing your extension files
   - The extension should appear in your extensions list with a puzzle piece icon

### Option 2: Create and Install as CRX (Advanced)

1. Follow steps 1-3 from Option 1
2. Click "Pack extension" 
3. Select your extension folder
4. Install the generated `.crx` file

## Configuration

### Settings Access
Click the extension icon in your browser toolbar to open the comprehensive settings panel with multiple tabs:

### Processing Tab
- **Batch Limit**: Control how many refunds to process at once (5, 10, 25, or unlimited)
- **Late Refund Threshold**: Set the day threshold for identifying late refunds (default: 30 days)
- **Auto-Ticketing Mode**: Choose between manual, prefill, or analysis-based ticket creation

### Behavior Tab
- **Default Checked State**: Set whether transactions are selected by default
- **Auto Analysis**: Automatically run analysis when pages load
- **Auto Expand**: Automatically expand rows for better data access
- **Skip If No New**: Skip processing if no new transactions found

### Tab Management Tab
- **Auto Close Clean Tabs**: Automatically close tabs with no issues found
- **Auto Close Timer**: Set delay before auto-closing tabs (0 = never)
- **Keep Last Tabs**: Limit the number of kept tabs (0 = unlimited)

### Notifications Tab
- **Notification Duration**: How long to show notifications (0 = never auto-hide)
- **Relationship Notifications**: Enable alerts for transaction relationship changes

### URL Handling Tab
- **URL Rewriting**: Enable automatic entitlement URL conversion
- **Open in New Tab**: Control whether URLs open in new tabs

### Debug Tab
- **Page Stabilize Time**: Wait time for page loading (default: 3000ms)
- **Row Wait Time**: Wait time for row loading (default: 2000ms)
- **Retry Settings**: Configure retry logic for failed operations

## Detailed Settings Reference

### Processing Settings

#### Batch Processing Limit
- **Purpose**: Controls how many refund transactions to process simultaneously
- **Options**: 1-50 transactions, or "All" for unlimited processing
- **Default**: 5 transactions
- **Impact**: Lower values reduce browser load but increase processing time. Higher values speed up processing but may cause browser slowdowns or timeouts.

#### Late Refund Threshold
- **Purpose**: Defines the maximum acceptable delay between a transaction and its refund
- **Range**: 7-120 days
- **Default**: 84 days
- **Impact**: Refunds issued after this threshold are flagged as "late refunds" and may trigger support ticket creation

#### Auto-Ticketing Behavior
- **Manual**: Support tickets are never created automatically
- **Pre-fill**: Opens support ticket page with pre-filled information but requires manual submission
- **Analysis Only**: Runs analysis but doesn't create tickets (useful for review-only scenarios)
- **Default**: Pre-fill

### Gap Analysis Settings

#### Gap Calculation Mode
- **Standard**: Basic gap detection using transaction dates only
- **Conservative**: Accounts for payment retry periods when refunds are present (subtracts buffer days)
- **CSV Enhanced**: Uses actual payment failure data from CSV downloads for precise gap detection
- **Aggressive**: More sensitive gap detection (may produce more false positives)
- **Default**: CSV Enhanced

#### Payment Failure Buffer (Days)
- **Purpose**: Days to subtract from renewal end dates when payment failures are detected
- **Range**: 7-60 days
- **Default**: 21 days
- **Impact**: In conservative mode, this buffer accounts for payment retry periods before declaring gaps

#### Auto-Download CSV for Gap Analysis
- **Purpose**: Automatically downloads transaction CSV data when gaps are detected
- **Default**: Enabled
- **Impact**: Required for CSV-enhanced gap calculations. Disabling falls back to standard mode.

#### Use CSV Payment Data for Accuracy
- **Purpose**: Incorporates actual payment failure data from CSV for more accurate gap detection
- **Default**: Enabled
- **Impact**: Provides precise deactivation dates based on real payment attempts rather than estimated dates

### Behavior Settings

#### Default Checkbox State
- **Purpose**: Determines whether transaction checkboxes are selected by default
- **Default**: All checked
- **Impact**: Affects which transactions are included in sum calculations and processing

#### Auto-Run Analysis on Page Load
- **Purpose**: Automatically starts maintenance period analysis when transaction pages load
- **Default**: Disabled
- **Impact**: Saves time but may slow page loading. Useful for frequent analysis workflows.

#### Auto-Expand Rows During Analysis
- **Purpose**: Automatically expands transaction detail rows to access maintenance period data
- **Default**: Enabled
- **Impact**: Required for gap analysis. Disabling may cause analysis failures.

#### Skip Analysis If No New Transactions
- **Purpose**: Prevents redundant analysis when no new transactions are detected
- **Default**: Enabled
- **Impact**: Improves performance by avoiding unnecessary processing of unchanged data

### Tab Management Settings

#### Auto-Close Tabs with No Issues
- **Purpose**: Automatically closes transaction tabs that have no gaps or late refunds
- **Default**: Disabled
- **Impact**: Reduces tab clutter but may close tabs you want to keep for reference

#### Auto-Close Tabs After (Minutes)
- **Purpose**: Sets a timer for automatic tab closure after analysis completion
- **Range**: 0-60 minutes (0 = never)
- **Default**: Never
- **Impact**: Helps manage browser resources but may close tabs prematurely

#### Keep Last N Processed Tabs
- **Purpose**: Limits the number of processed transaction tabs kept open
- **Range**: 0-50 tabs (0 = unlimited)
- **Default**: 10 tabs
- **Impact**: Prevents excessive tab accumulation during batch processing

### Notification Settings

#### Auto-Dismiss After (Seconds)
- **Purpose**: Controls how long relationship change notifications remain visible
- **Range**: 0-60 seconds (0 = never auto-dismiss)
- **Default**: 10 seconds
- **Impact**: Affects user experience - shorter times reduce distraction, longer times ensure message visibility

#### Relationship Change Notifications
- **Purpose**: Shows alerts when new transactions affect existing maintenance periods
- **Default**: Enabled
- **Impact**: Helps track when previously analyzed periods need re-evaluation due to new activity

### URL Handling Settings

#### URL Rewriting (Licenses → Transactions)
- **Purpose**: Automatically converts license entitlement URLs to transaction view URLs
- **Default**: Enabled
- **Impact**: Streamlines navigation between license and transaction views

#### Open Rewritten URLs in New Tab
- **Purpose**: Controls whether rewritten URLs open in new tabs or replace current tab
- **Default**: Enabled
- **Impact**: New tab preserves current page context, same tab provides seamless navigation

### Debug Settings

#### Page Stabilization Delay (ms)
- **Purpose**: Wait time for Atlassian Marketplace pages to fully load before processing
- **Range**: 500-10000ms
- **Default**: 3000ms
- **Impact**: Increase if pages aren't loading completely. Decrease for faster processing.

#### Row Expansion Wait (ms)
- **Purpose**: Wait time for transaction detail rows to expand and load data
- **Range**: 500-10000ms
- **Default**: 2000ms
- **Impact**: Increase if row expansion is failing. Affects gap analysis reliability.

#### Processing Interval (ms)
- **Purpose**: Delay between processing steps to prevent overwhelming the browser
- **Range**: 100-5000ms
- **Default**: 500ms
- **Impact**: Lower values speed up processing but may cause instability. Higher values are more reliable.

#### Maximum Retry Attempts
- **Purpose**: How many times to retry failed operations before giving up
- **Range**: 5-50 attempts
- **Default**: 15 attempts
- **Impact**: Higher values improve success rate but increase processing time for problematic pages.

#### Retry Interval (ms)
- **Purpose**: Delay between retry attempts
- **Range**: 500-5000ms
- **Default**: 1000ms
- **Impact**: Balances between retry frequency and not overwhelming the server.

#### Reset Processing State
- **Purpose**: Clears all active processing queues, jobs, and cached states
- **Impact**: Use when processing appears stuck or to start fresh after configuration changes

## Usage

### Basic Transaction Management

1. **Navigate to Transactions Page**:
   ```
   https://marketplace.atlassian.com/manage/vendors/YOUR_VENDOR_ID/reporting/transactions
   ```

2. **Automatic Enhancement**:
   - Extension automatically detects and enhances the transaction table
   - Checkboxes appear in the rightmost column
   - Sum total displays above the table
   - Process button and dropdown menu are added

3. **Select and Calculate**:
   - Individual checkboxes control transaction inclusion
   - Master "Select All" checkbox toggles all transactions
   - Running total updates in real-time
   - Amounts handle positive/negative values correctly

### Advanced Processing Workflows

#### Single AEN Analysis
1. Navigate to a transaction page for an App Entitlement Number
2. Click **Process** button for automated workflow:
   - Expands all rows to access detailed information
   - Analyzes maintenance periods for gaps
   - Detects late refunds beyond threshold
   - Files support tickets for identified issues
   - Marks transactions with status indicators

#### Sequential Refund Processing
1. Navigate to the refunds view: `...transactions?saleType=refund`
2. Click **Process** to start batch processing:
   - Identifies unprocessed refunds (no status indicators)
   - Extracts AEN transaction links from expanded rows
   - Opens each AEN in a new tab for analysis
   - Processes each tab automatically
   - Tracks progress and allows manual continuation

#### Manual Controls
Use the dropdown menu next to the Process button for individual actions:
- **Expand/Collapse All**: Toggle row expansion state
- **Analyze Maintenance Periods**: Run analysis without ticketing
- **File Support Ticket**: Create tickets for identified issues
- **Reset History for Page Records**: Clear processing status for visible transactions

### Demo Mode

Demo mode provides realistic scenarios for testing and training:

1. **Access Demo Settings**: Click extension icon → Demo tab
2. **Choose Scenario**:
   - **Clean AEN**: Perfect maintenance with no issues
   - **Maintenance Gaps**: Contains coverage gaps requiring attention
   - **Late Refunds**: Refunds issued after 30-day threshold
   - **Mixed Issues**: Complex scenario with multiple problem types
3. **Toggle Demo Mode**: Enable/disable and switch between scenarios
4. **Visual Indicators**: Demo mode shows clear visual indicators when active

### Support Ticket Integration

The extension integrates with Atlassian's support system:

1. **Automatic Data Collection**: Gathers issue details during analysis
2. **Support Page Integration**: Pre-fills forms when opening support tickets
3. **Ticket Tracking**: Prevents duplicate tickets for the same issues
4. **Status Updates**: Marks transactions as ticketed in the UI

## Supported URLs

The extension activates on URLs matching these patterns:
```
https://marketplace.atlassian.com/manage/vendors/*/reporting/transactions*
https://support.atlassian.com/contact/ (for ticket automation)
```

Examples:
- `https://marketplace.atlassian.com/manage/vendors/1212980/reporting/transactions`
- `https://marketplace.atlassian.com/manage/vendors/1212980/reporting/transactions?text=search-term`
- `https://marketplace.atlassian.com/manage/vendors/1212980/reporting/transactions?saleType=refund`

## Technical Architecture

### File Structure
```
mpac-ui-chrome-extension/
├── manifest.json          # Extension configuration and permissions
├── content.js            # Main functionality and automation logic
├── popup.html           # Settings interface HTML
├── popup.js             # Settings interface functionality
├── styles.css           # Custom styling and visual enhancements
├── support.js           # Support ticket form automation
├── demo-mode.js         # Demo mode controller and DOM manipulation
├── demo-data.js         # Demo scenario data generation
└── README.md           # This documentation file
```

### Core Components

#### Content Script (`content.js`)
- **Table Processing**: Enhances transaction tables with checkboxes and controls
- **Analysis Engine**: Detects maintenance gaps and late refunds
- **Automation Workflow**: Orchestrates sequential processing operations
- **State Management**: Persists checkbox states and processing history
- **URL Rewriting**: Converts entitlement URLs automatically

#### Settings System (`popup.js`)
- **Configuration Management**: Comprehensive settings with local storage
- **Real-time Updates**: Settings changes apply immediately
- **User Interface**: Tabbed interface for organized settings
- **Validation**: Input validation and sensible defaults

#### Support Integration (`support.js`)
- **Form Automation**: Pre-fills support ticket forms
- **Data Integration**: Uses analysis results for ticket content
- **Error Handling**: Robust form filling with fallbacks

#### Demo System (`demo-mode.js`, `demo-data.js`)
- **Scenario Generation**: Creates realistic transaction datasets
- **DOM Manipulation**: Safely replaces page content with demo data
- **State Management**: Preserves original content for restoration
- **Visual Indicators**: Clear demo mode identification

### Data Storage

The extension uses Chrome's local storage for:
- **User Settings**: All configuration options and preferences
- **Processing History**: Transaction analysis results and status
- **Queue Management**: Batch processing state and progress
- **Ticket Tracking**: Prevention of duplicate support tickets

### Security & Privacy

- **Local Processing**: All analysis happens locally in the browser
- **No Data Collection**: Extension doesn't send data to external servers
- **Minimal Permissions**: Only requests necessary permissions
- **Secure Storage**: Uses Chrome's secure local storage APIs

## Maintenance Period Analysis

### Gap Detection Logic
1. **Period Identification**: Extracts maintenance periods from transaction details
2. **Renewal Filtering**: Separates renewals from refunds for analysis
3. **Period Merging**: Combines overlapping or consecutive periods
4. **Gap Calculation**: Identifies missing coverage between merged periods
5. **Value Estimation**: Calculates potential revenue impact of gaps

### Late Refund Detection
1. **Refund Matching**: Links refunds to original renewal transactions
2. **Time Calculation**: Measures days between original transaction and refund
3. **Threshold Comparison**: Flags refunds exceeding configured threshold
4. **Impact Assessment**: Tracks refund values and frequency

### Status Indicators
- ✅ **Clean**: Transaction analyzed with no issues found
- ⚠️ **Needs Re-analysis**: New related transactions detected
- ❌ **Issues**: Confirmed maintenance gaps or late refunds identified

## Troubleshooting

### Extension Not Activating

1. **Check URL**: Ensure you're on a supported Atlassian Marketplace transactions page
2. **Verify Installation**: Go to `chrome://extensions/` and confirm extension is enabled
3. **Refresh Page**: Try refreshing the page after installing the extension
4. **Check Console**: Open DevTools (F12) and look for error messages in console

### Processing Issues

1. **Settings Check**: Verify settings are configured appropriately for your use case
2. **Reset Processing State**: Use the reset button in settings if processing appears stuck
3. **Clear History**: Reset processing history for problematic records
4. **Check Permissions**: Ensure extension has necessary permissions for storage and tabs

### Demo Mode Problems

1. **Settings Access**: Ensure demo mode settings are accessible in extension popup
2. **Data Loading**: Check console for demo data initialization messages
3. **Page Compatibility**: Demo mode requires the transaction table structure to be present
4. **Reset Demo**: Disable and re-enable demo mode to reset state

### Performance Optimization

1. **Batch Limits**: Reduce batch processing limits for better performance
2. **Debug Timing**: Adjust timing settings if page loading is slow
3. **Tab Management**: Enable auto-close features to manage browser resources
4. **Storage Cleanup**: Periodically reset processing history to clear old data

### Common Error Messages

**"Table not found"**: Page hasn't loaded completely; wait and refresh
**"Rows not available"**: React components still loading; increase wait times in debug settings
**"AEN not found"**: Not on an individual transaction page; navigate to specific AEN
**"Processing already active"**: Another process is running; wait for completion or reset state

## Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Compatible with Chromium-based Edge
- **Firefox**: Would require adaptation to Manifest V2
- **Safari**: Not supported

## Development

### Making Changes

1. Edit source files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Reload the Atlassian Marketplace page to see changes

### Debugging

- Use `console.log()` statements in any JavaScript file
- Open DevTools on the target page to see console output
- Use the extension popup to check settings and reset states
- Monitor Chrome's extension management page for errors

### Contributing

When contributing to the extension:
1. Test all scenarios thoroughly, including demo mode
2. Verify settings persistence across browser sessions
3. Check processing workflows with various data sets
4. Ensure proper error handling and user feedback
5. Update documentation for any new features

## License

This extension is provided as-is for vendor reporting enhancement. Feel free to modify and use according to your needs.

## Version History

- **v1.8** - Advanced Gap Analysis & CSV Integration:
  - **CSV-Enhanced Gap Calculation**: New calculation mode using actual payment failure data from CSV downloads for precise gap detection
  - **Automatic CSV Download**: Automatically downloads transaction CSV data when gaps are detected for enhanced analysis
  - **Payment Failure Detection**: Analyzes dunning status from CSV to identify exact deactivation dates based on failed payment attempts
  - **Conservative Gap Mode**: Accounts for payment retry periods by subtracting buffer days when refunds are present
  - **Enhanced Gap Accuracy**: Uses real payment data instead of estimated dates for more reliable gap detection
  - **CSV Parsing Engine**: Robust CSV parser handling quoted fields and payment status extraction
  - **Deactivation Date Detection**: Identifies when subscriptions were actually deactivated due to payment failures
  - **Gap Validation**: CSV-validated gaps show payment failure confirmation and actual deactivation dates
  - **Improved Settings UI**: Added comprehensive gap analysis controls with detailed explanations
  - **Payment Data Integration**: Incorporates vendor amount, payment status, and dunning attempt history
  - **Enhanced Gap Reporting**: Displays calculation mode, CSV validation status, and payment failure indicators

- **v1.7** - Comprehensive feature update:
  - Added sequential refund processing with progress tracking
  - Implemented advanced settings system with tabbed interface
  - Added demo mode with four realistic scenarios
  - Enhanced relationship tracking and status indicators
  - Improved processing state management and manual continuation
  - Added tab management and auto-close features
  - Expanded notification system with relationship change detection
  - Added comprehensive debug controls and timing settings

- **v1.6** - Support ticket automation and duplicate prevention
- **v1.5** - (Internal release) Support ticket filing functionality
- **v1.4** - (Internal release) Expand/collapse all button
- **v1.3** - Late refund detection in maintenance period analysis
- **v1.2** - Maintenance period analysis and expand/collapse features
- **v1.1** - Entitlement URL rewriting functionality
- **v1.0** - Initial release with basic checkbox and sum functionality

## API Reference

### Global Functions (Content Script)
- `processTable()` - Enhanced table processing with all features
- `runAnalysisAndTicketing(isAutomated)` - Main analysis workflow
- `processRefundsSequentially()` - Batch refund processing
- `analyzeMaintenancePeriods()` - Gap and late refund analysis
- `fileSupportTicket(isAutomated)` - Support ticket creation
- `resetProcessingState()` - Clear processing queues and state
- `resetHistoryForPageRecords()` - Clear status for visible records

### Settings Management
- `loadUserSettings()` - Load configuration from storage
- `getUserSettings()` - Get current settings with defaults
- Settings are automatically saved when changed in the popup interface

### Demo Mode API
- `initializeDemoMode()` - Initialize demo mode controller
- `DEMO_SCENARIOS` - Available demo scenarios and data
- Demo mode settings are managed through the extension popup

This comprehensive extension transforms the Atlassian Marketplace vendor experience with powerful automation, analysis, and management capabilities while maintaining ease of use and reliable operation.
