# Atlassian Marketplace Transaction Enhancer

A Chrome extension that enhances the Atlassian Marketplace vendor reporting pages by adding checkboxes to transaction rows, calculating sums, and rewriting entitlement URLs.

## Features

- ✅ **Checkboxes for each transaction row** - Easily select/deselect individual transactions
- ✅ **Default checked state** - All transactions are selected by default
- ✅ **Running total calculation** - Displays the sum of Net $ amounts for checked rows
- ✅ **Select All functionality** - Master checkbox in the header to select/deselect all rows
- ✅ **Real-time updates** - Sum updates automatically as you check/uncheck boxes
- ✅ **Process Button with Dropdown** - A primary "Process" button that expands all rows, runs an analysis, and files a support ticket if issues are found. A dropdown menu provides individual access to each of these actions.
- ✅ **Duplicate Ticket Prevention** - The extension now tracks which issues have already been ticketed and prevents the creation of duplicate support tickets. The UI indicates which items have been ticketed.
- ✅ **Entitlement URL rewriting** - Automatically rewrites entitlement URLs from licenses to transactions pages
- ✅ **Responsive design** - Works on desktop and mobile layouts
- ✅ **Accessibility support** - Proper ARIA labels and keyboard navigation

## Installation

### Option 1: Load as Unpacked Extension (Developer Mode)

1. **Download the extension files**:
   - Save all files (`manifest.json`, `content.js`, `styles.css`, `popup.html`, `popup.js`) to a folder on your computer

2. **Open Chrome Extensions page**:
   - Go to `chrome://extensions/` in your browser
   - Or navigate to Chrome menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**:
   - Click "Load unpacked" button
   - Select the folder containing your extension files
   - The extension should now appear in your extensions list

### Option 2: Create and Install as CRX (Advanced)

If you prefer to package the extension:

1. Follow steps 1-3 from Option 1
2. Click "Pack extension" 
3. Select your extension folder
4. Install the generated `.crx` file

## Usage

1. **Navigate to Atlassian Marketplace**:
   - Go to your vendor dashboard at `https://marketplace.atlassian.com/manage/vendors/YOUR_VENDOR_ID/reporting/transactions`

2. **Automatic Enhancement**:
   - The extension will automatically detect the transactions table
   - Checkboxes will be added to the right of each row
   - All checkboxes will be checked by default
   - A sum total will appear above the table

3. **Interact with Checkboxes**:
   - Uncheck individual rows to exclude them from the total
   - Use the "Select All" checkbox in the header to toggle all rows
   - Watch the total update in real-time

## Supported URLs

The extension activates on URLs matching this pattern:
```
https://marketplace.atlassian.com/manage/vendors/*/reporting/transactions*
```

Examples:
- `https://marketplace.atlassian.com/manage/vendors/1212980/reporting/transactions`
- `https://marketplace.atlassian.com/manage/vendors/1212980/reporting/transactions?text=search-term`

## URL Rewriting Feature

The extension automatically detects and rewrites entitlement URLs that appear when expanding transaction details **only on the transactions page**:

**Before:** `https://marketplace.atlassian.com/manage/vendors/1212980/reporting/licenses?text=E-43C-SM9-48S-UTA`

**After:** `https://marketplace.atlassian.com/manage/vendors/1212980/reporting/transactions?text=E-43C-SM9-48S-UTA`

This ensures that clicking on entitlement numbers takes you to the transactions page instead of the licenses page, providing a more consistent workflow for tracking transaction details. The URL rewriting only occurs when you are viewing the transactions page.

## Technical Details

### Files Structure

```
mpac-ui-chrome-extension/
├── manifest.json          # Extension configuration
├── content.js            # Main functionality script
├── styles.css            # Custom styles
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
└── README.md           # This file
```

### How It Works

1. **Content Script Injection**: The extension injects `content.js` into matching pages
2. **DOM Observation**: Waits for the React-based table to load completely
3. **Table Enhancement**: 
   - Adds a new column with checkboxes to each row
   - Parses Net $ amounts and stores them as data attributes
   - Creates a sum display component
4. **URL Rewriting**: Automatically detects and rewrites entitlement URLs from licenses to transactions (only on transactions pages)
5. **Event Handling**: Listens for checkbox changes and updates the total
6. **SPA Navigation**: Monitors URL changes to re-initialize on page transitions
7. **Dynamic Content Monitoring**: Watches for new content (like expanded rows) to apply URL rewriting

### Amount Parsing

The extension handles various amount formats:
- Positive amounts: `$1,234.56`
- Negative amounts: `-$1,234.56` 
- Zero amounts: `$0.00`
- Removes commas and currency symbols for calculation

## Troubleshooting

### Extension Not Working

1. **Check URL**: Ensure you're on a supported Atlassian Marketplace transactions page
2. **Refresh Page**: Try refreshing the page after installing the extension
3. **Check Console**: Open DevTools (F12) and look for any error messages
4. **Verify Installation**: Go to `chrome://extensions/` and ensure the extension is enabled

### Checkboxes Not Appearing

1. **Wait for Load**: The extension waits for the table to fully load (React components)
2. **Check Table Structure**: Ensure the page has the expected `[role="treegrid"]` table
3. **Clear Cache**: Try clearing browser cache and reloading

### Sum Not Calculating

1. **Check Amount Format**: Ensure Net $ amounts are in expected format
2. **JavaScript Errors**: Check browser console for any script errors
3. **Re-select Rows**: Try unchecking and rechecking boxes to trigger recalculation

## Development

### Making Changes

1. Edit the source files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Reload the Atlassian Marketplace page to see changes

### Debugging

- Use `console.log()` statements in `content.js`
- Open DevTools on the target page to see console output
- Use the extension popup to check activation status

## Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Should work with Chromium-based Edge
- **Firefox**: Would require conversion to Manifest V2
- **Safari**: Not supported

## License

This extension is provided as-is for demonstration purposes. Feel free to modify and use according to your needs.

## Version History

- **v1.7** - Replaced individual action buttons with a "Process" button and dropdown menu. Added duplicate ticket prevention to avoid filing multiple tickets for the same issue.
- **v1.6** - Added a "File Support Ticket" button to automate the creation of support tickets for maintenance gaps and late refunds.
- **v1.5** - (Internal release) Added support ticket filing functionality.
- **v1.4** - (Internal release) Added expand/collapse all button.
- **v1.3** - Added late refund detection to the maintenance period analysis.
- **v1.2** - Added maintenance period analysis and expand/collapse all features.
- **v1.1** - Added entitlement URL rewriting functionality
- **v1.0** - Initial release with basic checkbox and sum functionality