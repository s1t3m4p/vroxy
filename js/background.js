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
  chrome.debugger.getTargets((tabs) => {
    const currentTab = tabs.find((obj) => obj.tabId === details.tabId)
    if (!currentTab?.attached) {
      attachDebugger(details.tabId)
    }
  })
})
