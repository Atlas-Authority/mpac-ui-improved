function log(message) {
  console.log(`[Support Form Filler] ${message}`);
}

function fillSupportForm() {
  log('Attempting to fill support form...');
  chrome.storage.local.get('supportTicketData', (data) => {
    if (data.supportTicketData) {
      log('Found support ticket data in storage.');
      const { aen, summary, description } = data.supportTicketData;

      const waitForElement = (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(interval);
              resolve(element);
            } else if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms.`));
            }
          }, 100);
        });
      };

      const waitForOption = (optionText, timeout = 10000) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const interval = setInterval(() => {
            const allOptions = document.querySelectorAll('.custom-ak-select__option');
            let foundOption = null;
            for (const option of allOptions) {
              if (option.textContent.includes(optionText)) {
                foundOption = option;
                break;
              }
            }

            if (foundOption) {
              clearInterval(interval);
              resolve(foundOption);
            } else if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error(`Option with text "${optionText}" not found within ${timeout}ms.`));
            }
          }, 100);
        });
      };

      const clickAndSelect = async (dropdownId, optionText) => {
        try {
          const dropdownSelector = `#${dropdownId} .custom-ak-select__control`;
          log(`Clicking dropdown: ${dropdownSelector}`);
          const dropdown = await waitForElement(dropdownSelector);
          // More robust click simulation
          dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          dropdown.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

          // Wait for the specific option to appear
          log(`Waiting for option: "${optionText}"`);
          const optionToClick = await waitForOption(optionText);
          
          log(`Selecting option: "${optionText}"`);
          // More robust click simulation
          optionToClick.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          optionToClick.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          optionToClick.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        } catch (error) {
          log(`Error in clickAndSelect for dropdown ID "${dropdownId}": ${error.message}`);
          return false;
        }
      };

      const setInputValue = async (selector, value) => {
        try {
            const input = await waitForElement(selector);
            log(`Setting value for: ${selector}`);
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true })); // Some frameworks need change event too
            return true;
        } catch (error) {
            log(`Error setting value for "${selector}": ${error.message}`);
            return false;
        }
      };

      async function executeFormFill() {
        log('Executing form fill sequence...');
        
        if (await clickAndSelect('inquiryCategory', 'Sales Support')) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for next dropdown
            if (await clickAndSelect('partnerSalesSupportTopics', 'Other (Purchasing, Billing, or Licensing related)')) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for text fields
                await setInputValue('#summary', summary);
                await setInputValue('#support_entitlement_number', aen);
                await setInputValue('#rf-ak-field-description', description);
                log('Form fill sequence complete.');
                
                // Clean up storage
                chrome.storage.local.remove('supportTicketData', () => {
                    log('Cleaned up support ticket data from storage.');
                });
            }
        }
      }

      // Wait for the first dropdown to be clickable.
      waitForElement('#inquiryCategory .custom-ak-select__control')
        .then(() => {
            executeFormFill();
        })
        .catch(err => {
            log(err.message);
        });

    } else {
      log('No support ticket data found in storage.');
    }
  });
}

// The support page is a single-page application.
// We need to be careful not to run the script multiple times.
let formFillerExecuted = false;
const observer = new MutationObserver((mutations, obs) => {
  const inquiryCategory = document.querySelector('#inquiryCategory');
  if (inquiryCategory && !formFillerExecuted) {
    formFillerExecuted = true;
    log('Inquiry category found, starting form fill.');
    fillSupportForm();
    obs.disconnect(); // Stop observing once we've found the form
    log('Observer disconnected.');
  }
});

log('Support page script loaded. Observing for form.');
observer.observe(document.body, {
  childList: true,
  subtree: true
});