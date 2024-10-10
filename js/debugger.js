const attachDebugger = (tabId) => {
  chrome.storage.local.get(['timezone', 'locale', 'lat', 'lon'], (storage) => {
    if (storage.timezone || storage.locale || storage.lat || storage.lon) {
      console.log(storage.lat, storage.lon)

      chrome.debugger.attach({ tabId: tabId }, '1.3', () => {
        if (!chrome.runtime.lastError) {
          if (storage.timezone) {
            chrome.debugger.sendCommand(
              { tabId: tabId },
              'Emulation.setTimezoneOverride',
              {
                timezoneId: storage.timezone,
              },
              () => {
                if (
                  chrome.runtime.lastError &&
                  chrome.runtime.lastError.message?.includes(
                    'Timezone override is already in effect'
                  )
                ) {
                  chrome.debugger.detach({ tabId })
                }
              }
            )
          }

          if (storage.lat || storage.lon) {
            chrome.debugger.sendCommand(
              { tabId: tabId },
              'Emulation.setGeolocationOverride',
              {
                latitude: storage.lat,
                longitude: storage.lon,
                accuracy: 1,
              }
            )
          }

          if (storage.locale) {
            chrome.debugger.sendCommand(
              { tabId: tabId },
              'Emulation.setLocaleOverride',
              {
                locale: storage.locale,
              }
            )
          }
        }
      })
    }
  })
}

const detachDebugger = () => {
  chrome.debugger.getTargets((tabs) => {
    for (const tab in tabs) {
      if (tabs[tab].attached && tabs[tab].tabId) {
        chrome.debugger.sendCommand(
          { tabId: tabs[tab].tabId },
          'Emulation.clearGeolocationOverride',
          {
            autoAttach: true,
            waitForDebuggerOnStart: false,
            flatten: true,
          }
        )
        chrome.debugger.detach({ tabId: tabs[tab].tabId })
      }
    }
  })
}

export { attachDebugger, detachDebugger }
