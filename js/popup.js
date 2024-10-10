import { detachDebugger } from './debugger.js'
import locationsConfigurations from './locationsConfigurations.js'
import countryLocales from './countryLocales.js'

const extensionVersion = chrome.runtime.getManifest().version
document.getElementById('extensionVersion').textContent = `v${extensionVersion}`

const reloadButton = document.getElementById('reloadButton')
const infoButton = document.getElementById('infoButton')
const configurationSelect = document.querySelector(
  'select[name="configuration"]'
)
const locationsOptGroup = document.getElementById('locationsOptGroup')
const timeZoneInput = document.querySelector('input[name="timeZone"]')
const localeInput = document.querySelector('input[name="locale"]')
const latitudeInput = document.querySelector('input[name="latitude"]')
const longitudeInput = document.querySelector('input[name="longitude"]')

let ipData = null

// Add location options to the select menu
Object.entries(locationsConfigurations).forEach(([key, location]) => {
  const option = document.createElement('option')
  option.value = key
  option.textContent = location.name
  locationsOptGroup.appendChild(option)
})

const fetchIpData = async () => {
  try {
    const response = await fetch(
      'http://ip-api.com/json?fields=status,message,countryCode,lat,lon,timezone,query'
    )
    const data = await response.json()
    if (data.status === 'success') {
      ipData = data
    } else {
      console.error(`Failed to reload IP information: ${data.message}`)
    }
  } catch (error) {
    console.error('Error fetching IP information:', error)
  }
}

const handleConfigurationChange = () => {
  const configuration = configurationSelect.value

  if (configuration === 'browserDefault' || configuration === 'custom') {
    clearInputs()
  } else if (configuration === 'ipAddress') {
    if (ipData) {
      setInputs(
        ipData.timezone,
        countryLocales[ipData.countryCode],
        ipData.lat,
        ipData.lon
      )
    }
  } else {
    const selectedLocation = locationsConfigurations[configuration]
    if (selectedLocation) {
      setInputs(
        selectedLocation.timezone,
        selectedLocation.locale,
        selectedLocation.lat,
        selectedLocation.lon
      )
    } else {
      console.error('Unrecognized configuration. Please select a valid option.')
    }
  }

  saveToStorage()
}

const clearInputs = () => setInputs('', '', '', '')

const setInputs = (timezone, locale, lat, lon) => {
  timeZoneInput.value = timezone || ''
  localeInput.value = locale || ''
  latitudeInput.value = lat || ''
  longitudeInput.value = lon || ''
}

const saveToStorage = async () => {
  detachDebugger()
  await chrome.storage.local.set({
    configuration: configurationSelect.value,
    timezone: timeZoneInput.value || null,
    locale: localeInput.value || null,
    lat: parseFloat(latitudeInput.value) || null,
    lon: parseFloat(longitudeInput.value) || null,
  })
}

const loadFromStorage = async () => {
  try {
    const storage = await chrome.storage.local.get([
      'configuration',
      'timezone',
      'locale',
      'lat',
      'lon',
    ])
    configurationSelect.value = storage.configuration || 'browserDefault'
    setInputs(storage.timezone, storage.locale, storage.lat, storage.lon)
  } catch (error) {
    console.error('Error loading from storage:', error)
  }
}

// Debounce function to limit frequent save calls
const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

const debouncedSaveToStorage = debounce(saveToStorage, 300)

const handleInputChange = () => {
  configurationSelect.value = 'custom'
  debouncedSaveToStorage()
}

reloadButton.addEventListener('click', () => chrome.tabs.reload())
infoButton.addEventListener('click', () =>
  chrome.tabs.create({ url: 'html/info.html' })
)
configurationSelect.addEventListener('change', handleConfigurationChange)

timeZoneInput.addEventListener('input', handleInputChange)
localeInput.addEventListener('input', handleInputChange)
latitudeInput.addEventListener('input', handleInputChange)
longitudeInput.addEventListener('input', handleInputChange)

await loadFromStorage()
await fetchIpData()
