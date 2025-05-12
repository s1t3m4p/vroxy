import { attachDebugger, detachDebugger } from './debugger.js'

// Initialize 'enabled' state on install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ enabled: true, timezone: '', locale: '', lat: '', lon: '', activeTabs: [] }, () => {
      chrome.tabs.create({
        active: true,
        url: 'html/info.html',
      })
    })
  } else if (details.reason === 'update') {
    chrome.storage.local.get('enabled', (result) => {
      if (result.enabled === undefined) {
        chrome.storage.local.set({ enabled: true })
      }
    })
    // Initialize activeTabs array if it doesn't exist
    chrome.storage.local.get('activeTabs', (result) => {
      if (result.activeTabs === undefined) {
        chrome.storage.local.set({ activeTabs: [] })
      }
    })
  }
})

// Function to set warning badge on extension icon
const showWarningBadge = (tabId) => {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });

  // Store warning message in local storage to be displayed in popup
  chrome.storage.local.set({
    showWarningMessage: true,
    warningMessage: 'Spoofing is not possible on the page you just visited as it is protected by Chrome.'
  });
}

// Main function to apply spoofing settings
async function applySpoofingAndManageDebugger(tabId, url, settings) {
  if (!settings.enabled) {
    console.log(`Extension disabled. Detaching debugger and clearing overrides for tab ${tabId} if attached.`)
    detachDebugger(tabId) // Detach from specific tab if it was managed
    return
  }

  const { timezone, locale, lat, lon } = settings
  if (!timezone && !locale && !(lat && lon)) {
    console.log(`No spoofing settings configured for tab ${tabId}. Ensuring debugger is detached.`)
    detachDebugger(tabId) // Detach if no settings are active
    return
  }

  return attachDebugger(tabId, timezone, locale, lat, lon)
    .then(() => {
      console.log(`Successfully spoofed tab ${tabId} on ${url}`)
    })
    .catch((error) => {
      console.error(`Failed to attach debugger or set overrides for tab ${tabId} on ${url}: ${error.message}`)
    })
}

// Helper function to add tab to activeTabs if not already present
function addActiveTab(tabId) {
  chrome.storage.local.get('activeTabs', (result) => {
    const activeTabs = result.activeTabs || [];
    if (!activeTabs.includes(tabId)) {
      activeTabs.push(tabId);
      chrome.storage.local.set({ activeTabs });
      console.log(`Added tab ${tabId} to active tabs. Current active tabs: ${activeTabs}`);
    }
  });
}

// Listener for initial navigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return // Only main frame
  if (!details.url || !(details.url.startsWith('http:') || details.url.startsWith('https:'))) {
    // Also ignore chrome-extension:// if it's self, though popup/options won't trigger onBeforeNavigate this way.
    return
  }

  // Add tab to active tabs list
  addActiveTab(details.tabId);

  chrome.storage.local.get(['enabled', 'timezone', 'locale', 'lat', 'lon'], (settings) => {
    if (chrome.runtime.lastError) {
      console.error(`Error getting settings in onBeforeNavigate: ${chrome.runtime.lastError.message}`)
      return
    }
    const effectiveSettings = {
      enabled: settings.enabled !== undefined ? settings.enabled : true, // Default to enabled
      timezone: settings.timezone,
      locale: settings.locale,
      lat: settings.lat,
      lon: settings.lon,
    }
    applySpoofingAndManageDebugger(details.tabId, details.url, effectiveSettings)
  })
})

// Handle debugger detachment, including credential pages detection
chrome.debugger.onDetach.addListener((source, reason) => {
  if (!source.tabId) return;

  // Show warning badge on extension icon
  chrome.tabs.get(source.tabId, (tab) => {
    if (tab) {
      // the tab exists if the browser forcefully detaches debugger session
      console.log('Spoofing is not possible on this page as it is protected by Chrome.');
      showWarningBadge(source.tabId);
    } else {
      console.log(`Debugger detached from tab ${source.tabId}, reason: ${reason}`);
    }
  });
});

// Adjusted onUpdated listener: detach only when we are SURE the tab is on an unsupported scheme
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const candidateUrl = changeInfo.url ?? tab.url; // use newest url if provided, else current

  // If we still don't have a URL (this happens in early navigation stages), postpone any action.
  if (!candidateUrl) {
    return;
  }

  // detachDebugger(tabId);

  const isHttp = candidateUrl.startsWith('http:') || candidateUrl.startsWith('https:');

  if (isHttp) {
    // Add tab to active tabs list
    addActiveTab(tabId);

    if (changeInfo.url || changeInfo.status === 'complete') {
      console.log(`Tab ${tabId} updated. URL: ${candidateUrl}, ChangeInfo: ${JSON.stringify(changeInfo)}. Re-evaluating spoofing.`);
      chrome.storage.local.get(['enabled', 'timezone', 'locale', 'lat', 'lon'], (settings) => {
        if (chrome.runtime.lastError) {
          console.error(`Error getting settings in onUpdated: ${chrome.runtime.lastError.message}`);
          return;
        }
        const effectiveSettings = {
          enabled: settings.enabled !== undefined ? settings.enabled : true,
          timezone: settings.timezone,
          locale: settings.locale,
          lat: settings.lat,
          lon: settings.lon,
        };
        if (effectiveSettings.enabled) {
          applySpoofingAndManageDebugger(tabId, candidateUrl, effectiveSettings);
        } else {
          detachDebugger(tabId);
        }
      });
    }
  } else {
    // Only detach when we positively know the tab is on a non-debuggable scheme.
    if (changeInfo.url || changeInfo.status === 'complete') {
      console.log(`Tab ${tabId} navigated to unsupported URL (${candidateUrl}). Detaching debugger if necessary.`);
      detachDebugger(tabId);
    }
  }
});

// Listener for client-side navigations (history API)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return; // Only main frame
  if (details.url && (details.url.startsWith('http:') || details.url.startsWith('https:'))) {
    // Add tab to active tabs list
    addActiveTab(details.tabId);

    console.log(`History state updated for tab ${details.tabId} to ${details.url}. Re-evaluating spoofing.`);
    chrome.storage.local.get(['enabled', 'timezone', 'locale', 'lat', 'lon'], (settings) => {
      if (chrome.runtime.lastError) {
        console.error(`Error getting settings in onHistoryStateUpdated: ${chrome.runtime.lastError.message}`);
        return;
      }
      const effectiveSettings = {
        enabled: settings.enabled !== undefined ? settings.enabled : true,
        timezone: settings.timezone,
        locale: settings.locale,
        lat: settings.lat,
        lon: settings.lon,
      };
      if (effectiveSettings.enabled) {
        applySpoofingAndManageDebugger(details.tabId, details.url, effectiveSettings);
      } else {
        // If disabled globally, ensure debugger is detached.
        detachDebugger(details.tabId);
      }
    });
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`Tab ${tabId} closed. Detaching debugger if attached.`)
  detachDebugger(tabId) // Use specific tabId detach

  // Remove tab from activeTabs array
  chrome.storage.local.get('activeTabs', (result) => {
    if (result.activeTabs) {
      const activeTabs = result.activeTabs.filter(id => id !== tabId);
      chrome.storage.local.set({ activeTabs });
      console.log(`Removed tab ${tabId} from active tabs. Remaining tabs: ${activeTabs}`);
    }
  });
})

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'settingsChanged') {
    chrome.storage.local.get(['enabled', 'timezone', 'locale', 'lat', 'lon', 'activeTabs'], (settings) => {
      if (chrome.runtime.lastError) {
        console.error(`Error getting settings on settingsChanged: ${chrome.runtime.lastError.message}`)
        return
      }
      const effectiveSettings = {
        enabled: settings.enabled !== undefined ? settings.enabled : true,
        timezone: settings.timezone,
        locale: settings.locale,
        lat: settings.lat,
        lon: settings.lon,
      }

      const activeTabs = settings.activeTabs || [];
      if (activeTabs.length > 0) {
        console.log(`Applying updated settings to ${activeTabs.length} active tabs: ${activeTabs}`);
        activeTabs.forEach(tabId => {
          applySpoofingAndManageDebugger(tabId, tabId, effectiveSettings);
        });
      } else {
        console.log('No active tabs to update.');
      }
    })

    sendResponse({ status: 'Settings update processed' })
    return true // Indicates async response
  }
})
