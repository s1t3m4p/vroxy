const attachDebugger = (tabId, timezone, locale, lat, lon) => {
  if (timezone || locale || lat || lon) {
    chrome.debugger.attach({ tabId: tabId }, '1.3', () => {
      if (!chrome.runtime.lastError) {
        if (timezone) {
          chrome.debugger.sendCommand(
            { tabId: tabId },
            'Emulation.setTimezoneOverride',
            {
              timezoneId: timezone,
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

        if (lat || lon) {
          chrome.debugger.sendCommand(
            { tabId: tabId },
            'Emulation.setGeolocationOverride',
            {
              latitude: lat,
              longitude: lon,
              accuracy: 1,
            }
          )
        }

        if (locale) {
          chrome.debugger.sendCommand(
            { tabId: tabId },
            'Emulation.setLocaleOverride',
            {
              locale,
            }
          )
        }
      }
    })
  }
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
