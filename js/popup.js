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
const configNameInput = document.querySelector('input[name="configName"]');
const saveConfigButton = document.querySelector('button[name="saveConfig"]');
const cancelEditButton = document.querySelector('button[name="cancelEdit"]');
const configActionButtons = document.querySelector('div[name="configActions"]');
const editConfigButton = document.querySelector('button[name="editConfig"]');
const deleteConfigButton = document.querySelector('button[name="deleteConfig"]')
// const debuggerApiModeCheckbox = document.querySelector(
//   'input[name="debuggerApiMode"]'
// )

let ipData = null
let isEditing = false;
let editingConfigId = null

// Add location options to the select menu
Object.entries(locationsConfigurations).forEach(([key, location]) => {
  const option = document.createElement('option')
  option.value = key
  option.textContent = location.name
  locationsOptGroup.appendChild(option)
})

// Load saved configurations
const loadSavedConfigurations = async () => {
  const { savedConfigurations = {} } = await chrome.storage.local.get('savedConfigurations');
  savedConfigsOptGroup.innerHTML = '';
  Object.entries(savedConfigurations).forEach(([key, config]) => {
    const option = document.createElement('option');
    option.value = `saved:${key}`;
    option.textContent = config.name;
    savedConfigsOptGroup.appendChild(option);
  });
};

const showEditMode = (configName = '') => {
  isEditing = true;
  configNameInput.value = configName;
  configNameInput.classList.remove('hidden');
  saveConfigButton.classList.remove('hidden');
  cancelEditButton.classList.remove('hidden');
  configActionButtons.classList.add('hidden');
};

const hideEditMode = () => {
  isEditing = false;
  editingConfigId = null;
  configNameInput.classList.add('hidden');
  saveConfigButton.classList.add('hidden');
  cancelEditButton.classList.add('hidden');
};

const saveCurrentConfiguration = async () => {
  const name = configNameInput.value.trim();
  if (!name) {
    alert('Please enter a configuration name');
    return;
  }

  const { savedConfigurations = {} } = await chrome.storage.local.get('savedConfigurations');

  const newConfig = {
    name,
    timezone: timeZoneInput.value,
    locale: localeInput.value,
    lat: parseFloat(latitudeInput.value) || null,
    lon: parseFloat(longitudeInput.value) || null,
  };

  const configId = editingConfigId || Date.now().toString();
  savedConfigurations[configId] = newConfig;

  await chrome.storage.local.set({ savedConfigurations });
  await loadSavedConfigurations();

  // After saving, switch to the saved configuration view
  configurationSelect.value = `saved:${configId}`;
  hideEditMode();
  configActionButtons.classList.remove('hidden');
  saveToStorage();
}

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

const getCurrentConfigId = () => {
  const configuration = configurationSelect.value;
  return configuration.startsWith('saved:') ? configuration.replace('saved:', '') : null;
};

const deleteConfiguration = async () => {
  const configId = getCurrentConfigId();
  if (!configId) return;

  const { savedConfigurations = {} } = await chrome.storage.local.get('savedConfigurations');
  const configName = savedConfigurations[configId]?.name;

  if (confirm(`Are you sure you want to delete "${configName}"?`)) {
    delete savedConfigurations[configId];
    await chrome.storage.local.set({ savedConfigurations });
    await loadSavedConfigurations();
    configurationSelect.value = 'browserDefault';
    clearInputs();
    hideEditMode();
    configActionButtons.classList.add('hidden');
    saveToStorage();
  }
};

const editConfiguration = async () => {
  const configId = getCurrentConfigId();
  if (!configId) return;

  const { savedConfigurations = {} } = await chrome.storage.local.get('savedConfigurations');
  const currentConfig = savedConfigurations[configId];

  editingConfigId = configId;
  showEditMode(currentConfig.name);
};

const cancelEdit = () => {
  if (editingConfigId) {
    // If we were editing an existing config, revert to that config
    configurationSelect.value = `saved:${editingConfigId}`;
    handleConfigurationChange();
  } else {
    // If we were creating a new config, revert to browser default
    configurationSelect.value = 'browserDefault';
    handleConfigurationChange();
  }
  hideEditMode();
}

const handleConfigurationChange = () => {
  const configuration = configurationSelect.value

  // Hide edit mode UI elements
  hideEditMode();

  if (configuration === 'browserDefault') {
    clearInputs()
    configActionButtons.classList.add('hidden');
  } else if (configuration === 'custom') {
    clearInputs();
    showEditMode();
    configActionButtons.classList.add('hidden')
  } else if (configuration === 'ipAddress') {
    if (ipData) {
      setInputs(
        ipData.timezone,
        countryLocales[ipData.countryCode],
        ipData.lat,
        ipData.lon
      )
    }
    configActionButtons.classList.add('hidden');
  } else if (configuration.startsWith('saved:')) {
    const configId = configuration.replace('saved:', '');
    chrome.storage.local.get('savedConfigurations', ({ savedConfigurations }) => {
      const config = savedConfigurations[configId];
      if (config) {
        setInputs(config.timezone, config.locale, config.lat, config.lon);
        configActionButtons.classList.remove('hidden');
      }
    })
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
      clearInputs()
    }
    configActionButtons.classList.add('hidden')
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
    // useDebuggerApi: debuggerApiModeCheckbox.checked,
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
      // 'useDebuggerApi',
    ])
    configurationSelect.value = storage.configuration || 'browserDefault'
    setInputs(storage.timezone, storage.locale, storage.lat, storage.lon)
    // debuggerApiModeCheckbox.checked = storage.useDebuggerApi || false

    // custom 모드일 때 edit 모드 활성화
    if (storage.configuration === 'custom') {
      showEditMode();
    }
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
  if (!isEditing && configurationSelect.value !== 'custom') {
    configurationSelect.value = 'custom'
    showEditMode();
  }
  debouncedSaveToStorage()
}

reloadButton.addEventListener('click', () => chrome.tabs.reload())
infoButton.addEventListener('click', () =>
  chrome.tabs.create({ url: 'html/info.html' })
)
configurationSelect.addEventListener('change', handleConfigurationChange)
saveConfigButton.addEventListener('click', saveCurrentConfiguration);
editConfigButton.addEventListener('click', editConfiguration);
deleteConfigButton.addEventListener('click', deleteConfiguration);
cancelEditButton.addEventListener('click', cancelEdit);
configNameInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') saveCurrentConfiguration();
  if (e.key === 'Escape') cancelEdit();
});
timeZoneInput.addEventListener('input', handleInputChange)
localeInput.addEventListener('input', handleInputChange)
latitudeInput.addEventListener('input', handleInputChange)
longitudeInput.addEventListener('input', handleInputChange)
// debuggerApiModeCheckbox.addEventListener('change', saveToStorage)

await loadFromStorage()
await loadSavedConfigurations();
await fetchIpData()
