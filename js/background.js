import { attachDebugger } from './debugger.js'

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      active: true,
      url: 'html/info.html',
    })
  }
})

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  chrome.storage.local.get(['timezone', 'locale', 'lat', 'lon'], (storage) => {
    chrome.debugger.getTargets((tabs) => {
      const currentTab = tabs.find((obj) => obj.tabId === details.tabId)
      if (!currentTab?.attached) {
        attachDebugger(
          details.tabId,
          storage.timezone,
          storage.locale,
          storage.lat,
          storage.lon
        )
      }
    })
  })
})

// chrome.webNavigation.onCommitted.addListener((details) => {
//   if (
//     details.url?.startsWith('chrome://') ||
//     details.url?.startsWith('chrome-extension://') ||
//     details.url?.startsWith('https://chromewebstore.google.com/')
//   )
//     return

//   chrome.storage.local.get(
//     ['useDebuggerApi', 'timezone', 'lat', 'lon'],
//     (storage) => {
//       if (!storage.useDebuggerApi) {
//         if (storage.timezone) {
//           chrome.scripting.executeScript({
//             target: { tabId: details.tabId, allFrames: true },
//             world: 'MAIN',
//             injectImmediately: true,
//             func: spoofTimezone,
//             args: [storage.timezone],
//           })
//         }

//         if (storage.lat && storage.lon) {
//           chrome.scripting.executeScript({
//             target: { tabId: details.tabId, allFrames: true },
//             world: 'MAIN',
//             injectImmediately: true,
//             func: spoofGeolocation,
//             args: [
//               {
//                 latitude: storage.lat,
//                 longitude: storage.lon,
//               },
//             ],
//           })
//         }
//       }
//     }
//   )
// })
