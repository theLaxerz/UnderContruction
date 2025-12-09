/**
 * Options Page Script - Settings Management
 */

// Default configuration
const DEFAULT_CONFIG = {
  apiUrl: 'ws://localhost:8080',
  httpFallbackUrl: 'http://localhost:8080',
  useWebSocket: true,
  pollingRate: 1000,
  autoConnect: false,
  authToken: '',
  logCommands: true,
  allowRawExecution: false
};

// DOM Elements
const form = document.getElementById('settingsForm');
const apiUrl = document.getElementById('apiUrl');
const httpFallbackUrl = document.getElementById('httpFallbackUrl');
const useWebSocket = document.getElementById('useWebSocket');
const pollingRate = document.getElementById('pollingRate');
const authToken = document.getElementById('authToken');
const autoConnect = document.getElementById('autoConnect');
const logCommands = document.getElementById('logCommands');
const allowRawExecution = document.getElementById('allowRawExecution');
const resetBtn = document.getElementById('resetBtn');
const testBtn = document.getElementById('testBtn');
const statusMessage = document.getElementById('statusMessage');

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Event listeners
form.addEventListener('submit', saveSettings);
resetBtn.addEventListener('click', resetSettings);
testBtn.addEventListener('click', testConnection);

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('domControlConfig');
    const config = { ...DEFAULT_CONFIG, ...result.domControlConfig };

    apiUrl.value = config.apiUrl;
    httpFallbackUrl.value = config.httpFallbackUrl;
    useWebSocket.checked = config.useWebSocket;
    pollingRate.value = config.pollingRate;
    authToken.value = config.authToken;
    autoConnect.checked = config.autoConnect;
    logCommands.checked = config.logCommands;
    allowRawExecution.checked = config.allowRawExecution;
  } catch (error) {
    showStatus('Failed to load settings: ' + error.message, 'error');
  }
}

// Save settings to storage
async function saveSettings(e) {
  e.preventDefault();

  const config = {
    apiUrl: apiUrl.value || DEFAULT_CONFIG.apiUrl,
    httpFallbackUrl: httpFallbackUrl.value || DEFAULT_CONFIG.httpFallbackUrl,
    useWebSocket: useWebSocket.checked,
    pollingRate: parseInt(pollingRate.value) || DEFAULT_CONFIG.pollingRate,
    authToken: authToken.value,
    autoConnect: autoConnect.checked,
    logCommands: logCommands.checked,
    allowRawExecution: allowRawExecution.checked
  };

  try {
    await chrome.storage.sync.set({ domControlConfig: config });

    // Notify background script of config change
    await chrome.runtime.sendMessage({ type: 'saveConfig', config });

    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

// Reset to default settings
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  try {
    await chrome.storage.sync.set({ domControlConfig: DEFAULT_CONFIG });

    // Reload the form
    await loadSettings();

    showStatus('Settings reset to defaults', 'info');
  } catch (error) {
    showStatus('Failed to reset settings: ' + error.message, 'error');
  }
}

// Test connection
async function testConnection() {
  const url = useWebSocket.checked ? apiUrl.value : httpFallbackUrl.value;

  if (!url) {
    showStatus('Please enter a URL to test', 'error');
    return;
  }

  showStatus('Testing connection...', 'info');

  if (useWebSocket.checked) {
    testWebSocket(url);
  } else {
    testHttp(url);
  }
}

// Test WebSocket connection
function testWebSocket(url) {
  try {
    const ws = new WebSocket(url);

    const timeout = setTimeout(() => {
      ws.close();
      showStatus('Connection timed out (5s)', 'error');
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      showStatus('WebSocket connection successful!', 'success');
      ws.close();
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      showStatus('WebSocket connection failed. Make sure the server is running.', 'error');
    };
  } catch (error) {
    showStatus('Invalid WebSocket URL: ' + error.message, 'error');
  }
}

// Test HTTP connection
async function testHttp(url) {
  try {
    const response = await fetch(url + '/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken.value && { 'Authorization': `Bearer ${authToken.value}` })
      }
    });

    if (response.ok) {
      showStatus('HTTP connection successful!', 'success');
    } else {
      showStatus(`HTTP connection failed: ${response.status} ${response.statusText}`, 'error');
    }
  } catch (error) {
    showStatus('HTTP connection failed: ' + error.message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;

  // Auto-hide success/info messages after 5 seconds
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 5000);
  }
}
