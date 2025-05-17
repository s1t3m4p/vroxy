const attachDebugger = (tabId, timezone, locale, lat, lon) => {
  return new Promise((resolve, reject) => {
    // Ensure lat and lon are floats if they exist
    const numericLat = lat ? parseFloat(lat) : null;
    const numericLon = lon ? parseFloat(lon) : null;

    if (!timezone && !locale && (numericLat === null || numericLon === null)) {
      resolve(); // Nothing to do
      return;
    }

    chrome.debugger.attach({ tabId }, '1.3', () => {
      const promises = [];

      if (!chrome.runtime.lastError && timezone) {
        promises.push(new Promise((resCmd) => {
          chrome.debugger.sendCommand(
            { tabId },
            'Emulation.setTimezoneOverride',
            { timezoneId: timezone },
            () => {
              if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message?.includes('Timezone override is already in effect')) {
                  console.warn(`Timezone override was already in effect for tab ${tabId}.`);
                } else if (chrome.runtime.lastError.message?.includes('Debugger is not attached to the tab with id')) {
                  // This can happen if detach was called concurrently or tab closed.
                  console.warn(`Error setting timezone (debugger not attached): ${chrome.runtime.lastError.message}`);
                } else {
                  console.error(`SetTimezoneOverride error for tab ${tabId}: ${chrome.runtime.lastError.message}`);
                }
              }
              resCmd(); // Resolve even if there was an error, to allow other commands to proceed.
            }
          );
        }));
      }

      if (numericLat !== null && numericLon !== null) {
        promises.push(new Promise((resCmd) => {
          chrome.debugger.sendCommand(
            { tabId },
            'Emulation.setGeolocationOverride',
            { latitude: numericLat, longitude: numericLon, accuracy: 1 },
            () => {
              if (chrome.runtime.lastError) {
                 if (chrome.runtime.lastError.message?.includes('Debugger is not attached to the tab with id')) {
                  console.warn(`Error setting geolocation (debugger not attached): ${chrome.runtime.lastError.message}`);
                } else {
                  console.error(`SetGeolocationOverride error for tab ${tabId}: ${chrome.runtime.lastError.message}`);
                }
              }
              resCmd();
            }
          );
        }));
      }

      if (locale) {
        promises.push(new Promise((resCmd) => {
          chrome.debugger.sendCommand(
            { tabId },
            'Emulation.setLocaleOverride',
            { locale },
            () => {
              if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message?.includes('Debugger is not attached to the tab with id')) {
                  console.warn(`Error setting locale (debugger not attached): ${chrome.runtime.lastError.message}`);
                } else {
                  console.error(`SetLocaleOverride error for tab ${tabId}: ${chrome.runtime.lastError.message}`);
                }
              }
              resCmd();
            }
          );
        }));
      }

      return Promise.all(promises)
        .then(resolve)
        .catch((error) => {
          // This catch is for Promise.all itself, which shouldn't happen if resCmd() is always called.
          console.error(`Error processing emulation commands for tab ${tabId}: ${error}`);
          reject(error);
        });
    });
  });
};

const processTarget = (target) => {
  if (target.attached && target.tabId) {
    const tabId = target.tabId;
    console.log(`Clearing overrides and detaching from tab ${tabId}`);
    // Chain commands to clear overrides, then detach
    // Send commands even if one fails, then detach.
    const clearGeo = new Promise(resolve => chrome.debugger.sendCommand({ tabId }, 'Emulation.clearGeolocationOverride', {}, () => {
      if (chrome.runtime.lastError) console.warn(`Error clearing geolocation for tab ${tabId}: ${chrome.runtime.lastError.message}`);
      resolve();
    }));

    const clearTimezone = new Promise(resolve => chrome.debugger.sendCommand({ tabId }, 'Emulation.setTimezoneOverride', { timezoneId: "" }, () => {
      if (chrome.runtime.lastError) console.warn(`Error clearing timezone for tab ${tabId}: ${chrome.runtime.lastError.message}`);
      resolve();
    }));

    const clearLocale = new Promise(resolve => chrome.debugger.sendCommand({ tabId }, 'Emulation.setLocaleOverride', { locale: "" }, () => {
      if (chrome.runtime.lastError) console.warn(`Error clearing locale for tab ${tabId}: ${chrome.runtime.lastError.message}`);
      resolve();
    }));

    return Promise.all([clearGeo, clearTimezone, clearLocale]).finally(() => {
      chrome.debugger.detach({ tabId })
        .then(() => console.log(`Successfully detached from tab ${tabId}`))
        .catch((e) => console.warn(`Error detaching debugger from tab ${tabId}: ${e.message}`));
    });
  }
};

const detachDebugger = (specificTabId = null) => {
  return new Promise((resolve, reject) => {
    if (specificTabId !== null) {
      chrome.debugger.getTargets((targets) => {
        const target = targets.find((t) => t.tabId === specificTabId);
        if (target) {
          resolve(processTarget(target))
        } else {
          resolve(); // No matching target found
        }
      });
    } else {
      // Global detach for all tabs
      chrome.debugger.getTargets((targets) => {
        resolve(Promise.all(targets.map(target => processTarget(target))))
      });
    }
  });
};

export { attachDebugger, detachDebugger }
