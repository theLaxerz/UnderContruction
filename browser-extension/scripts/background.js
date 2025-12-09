/**
 * Background Service Worker
 * Handles API communication and routes commands to content scripts
 */

// Connection state
let apiConnection = {
  websocket: null,
  isConnected: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  pollingInterval: null
};

// Default configuration
const DEFAULT_CONFIG = {
  apiUrl: 'ws://localhost:8080',
  httpFallbackUrl: 'http://localhost:8080',
  useWebSocket: true,
  pollingRate: 1000,
  autoConnect: false,
  authToken: ''
};

// Load configuration from storage
async function getConfig() {
  const result = await chrome.storage.sync.get('domControlConfig');
  return { ...DEFAULT_CONFIG, ...result.domControlConfig };
}

// Save configuration to storage
async function saveConfig(config) {
  await chrome.storage.sync.set({ domControlConfig: config });
}

// Initialize connection based on configuration
async function initializeConnection() {
  const config = await getConfig();

  if (!config.autoConnect) {
    console.log('DOM Control: Auto-connect disabled');
    return;
  }

  if (config.useWebSocket) {
    connectWebSocket(config);
  } else {
    startPolling(config);
  }
}

// WebSocket connection
function connectWebSocket(config) {
  if (apiConnection.websocket) {
    apiConnection.websocket.close();
  }

  try {
    apiConnection.websocket = new WebSocket(config.apiUrl);

    apiConnection.websocket.onopen = () => {
      console.log('DOM Control: WebSocket connected');
      apiConnection.isConnected = true;
      apiConnection.reconnectAttempts = 0;

      // Send authentication if token exists
      if (config.authToken) {
        apiConnection.websocket.send(JSON.stringify({
          type: 'auth',
          token: config.authToken
        }));
      }

      // Notify popup of connection state
      broadcastConnectionState(true);
    };

    apiConnection.websocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await handleApiMessage(message);
      } catch (error) {
        console.error('DOM Control: Failed to parse message', error);
      }
    };

    apiConnection.websocket.onclose = () => {
      console.log('DOM Control: WebSocket disconnected');
      apiConnection.isConnected = false;
      broadcastConnectionState(false);

      // Attempt reconnection
      if (apiConnection.reconnectAttempts < apiConnection.maxReconnectAttempts) {
        apiConnection.reconnectAttempts++;
        const delay = apiConnection.reconnectDelay * Math.pow(2, apiConnection.reconnectAttempts - 1);
        setTimeout(() => connectWebSocket(config), delay);
      }
    };

    apiConnection.websocket.onerror = (error) => {
      console.error('DOM Control: WebSocket error', error);
    };

  } catch (error) {
    console.error('DOM Control: Failed to connect WebSocket', error);
  }
}

// HTTP Polling fallback
function startPolling(config) {
  if (apiConnection.pollingInterval) {
    clearInterval(apiConnection.pollingInterval);
  }

  apiConnection.pollingInterval = setInterval(async () => {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (config.authToken) {
        headers['Authorization'] = `Bearer ${config.authToken}`;
      }

      const response = await fetch(`${config.httpFallbackUrl}/api/commands`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        apiConnection.isConnected = true;
        const commands = await response.json();

        for (const command of commands) {
          await handleApiMessage(command);
        }
      }
    } catch (error) {
      apiConnection.isConnected = false;
      console.error('DOM Control: Polling error', error);
    }
  }, config.pollingRate);

  broadcastConnectionState(true);
}

// Stop polling
function stopPolling() {
  if (apiConnection.pollingInterval) {
    clearInterval(apiConnection.pollingInterval);
    apiConnection.pollingInterval = null;
  }
}

// Disconnect from API
function disconnect() {
  if (apiConnection.websocket) {
    apiConnection.websocket.close();
    apiConnection.websocket = null;
  }
  stopPolling();
  apiConnection.isConnected = false;
  apiConnection.reconnectAttempts = apiConnection.maxReconnectAttempts; // Prevent auto-reconnect
  broadcastConnectionState(false);
}

// Broadcast connection state to all extension components
function broadcastConnectionState(isConnected) {
  chrome.runtime.sendMessage({
    type: 'connectionStateChanged',
    isConnected
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}

// Handle messages from API
async function handleApiMessage(message) {
  console.log('DOM Control: Received message', message);

  const { type, tabId, command, payload } = message;

  switch (type) {
    case 'execute':
      await executeOnTab(tabId, command, payload);
      break;

    case 'executeAll':
      await executeOnAllTabs(command, payload);
      break;

    case 'query':
      const result = await queryTab(tabId, command, payload);
      sendToApi({ type: 'queryResult', requestId: message.requestId, result });
      break;

    case 'screenshot':
      const screenshot = await captureScreenshot(tabId);
      sendToApi({ type: 'screenshotResult', requestId: message.requestId, data: screenshot });
      break;

    case 'getTabs':
      const tabs = await chrome.tabs.query({});
      sendToApi({ type: 'tabsResult', requestId: message.requestId, tabs });
      break;

    default:
      console.warn('DOM Control: Unknown message type', type);
  }
}

// Execute command on specific tab
async function executeOnTab(tabId, command, payload) {
  try {
    // If no tabId specified, use active tab
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }

    if (!tabId) {
      console.error('DOM Control: No tab available');
      return;
    }

    await chrome.tabs.sendMessage(tabId, {
      type: 'domCommand',
      command,
      payload
    });
  } catch (error) {
    console.error('DOM Control: Failed to execute on tab', error);
  }
}

// Execute command on all tabs
async function executeOnAllTabs(command, payload) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'domCommand',
        command,
        payload
      });
    } catch (error) {
      // Tab might not have content script loaded
    }
  }
}

// Query DOM on specific tab
async function queryTab(tabId, command, payload) {
  try {
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }

    if (!tabId) {
      return { error: 'No tab available' };
    }

    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'domQuery',
      command,
      payload
    });

    return result;
  } catch (error) {
    return { error: error.message };
  }
}

// Capture screenshot
async function captureScreenshot(tabId) {
  try {
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    return dataUrl;
  } catch (error) {
    return { error: error.message };
  }
}

// Send message to API
function sendToApi(message) {
  if (apiConnection.websocket && apiConnection.websocket.readyState === WebSocket.OPEN) {
    apiConnection.websocket.send(JSON.stringify(message));
  } else {
    // Queue for HTTP send or log
    console.log('DOM Control: Would send to API', message);
  }
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleInternalMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

// Handle messages from extension components
async function handleInternalMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'connect':
      const config = await getConfig();
      if (config.useWebSocket) {
        connectWebSocket(config);
      } else {
        startPolling(config);
      }
      sendResponse({ success: true });
      break;

    case 'disconnect':
      disconnect();
      sendResponse({ success: true });
      break;

    case 'getConnectionState':
      sendResponse({ isConnected: apiConnection.isConnected });
      break;

    case 'executeCommand':
      await executeOnTab(message.tabId, message.command, message.payload);
      sendResponse({ success: true });
      break;

    case 'queryDom':
      const result = await queryTab(message.tabId, message.command, message.payload);
      sendResponse(result);
      break;

    case 'domResult':
      // Forward results from content script to API
      sendToApi({
        type: 'domResult',
        tabId: sender.tab?.id,
        result: message.result
      });
      sendResponse({ success: true });
      break;

    case 'getConfig':
      const currentConfig = await getConfig();
      sendResponse(currentConfig);
      break;

    case 'saveConfig':
      await saveConfig(message.config);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  initializeConnection();
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('DOM Control API Extension installed');
  initializeConnection();
});

// Export for module usage
export { getConfig, saveConfig, connectWebSocket, disconnect };
