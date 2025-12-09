/**
 * Popup Script - Extension UI Controller
 */

// DOM Controller method definitions for the dropdown
const METHODS = {
  select: ['one', 'all', 'byId', 'byClass', 'byTag', 'byName', 'byXPath', 'atPoint', 'allAtPoint'],
  create: ['element', 'text', 'comment', 'fragment', 'fromHTML'],
  manipulate: ['append', 'prepend', 'insertBefore', 'insertAfter', 'remove', 'removeAll', 'replace', 'clone', 'wrap', 'unwrap', 'empty'],
  content: ['html', 'text', 'outer', 'value'],
  attributes: ['get', 'set', 'remove', 'has', 'getAll', 'setMultiple', 'toggle'],
  classes: ['add', 'remove', 'toggle', 'has', 'replace', 'getAll'],
  style: ['get', 'set', 'remove', 'show', 'hide', 'toggle', 'injectCSS', 'removeCSS'],
  events: ['on', 'off', 'once', 'trigger', 'triggerCustom', 'click', 'focus', 'blur', 'mouse', 'keyboard'],
  traverse: ['parent', 'parents', 'closest', 'children', 'firstChild', 'lastChild', 'siblings', 'next', 'prev', 'nextAll', 'prevAll'],
  dimensions: ['rect', 'offset', 'scroll', 'scrollIntoView', 'width', 'height', 'innerWidth', 'innerHeight', 'scrollWidth', 'scrollHeight'],
  form: ['getData', 'setData', 'submit', 'reset', 'validate', 'reportValidity'],
  data: ['get', 'set', 'remove'],
  utils: ['waitFor', 'executeScript', 'getPageInfo', 'getLinks', 'getImages', 'getForms', 'serialize', 'highlight', 'clearHighlights']
};

// State
let isConnected = false;

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const settingsBtn = document.getElementById('settingsBtn');
const pickerBtn = document.getElementById('pickerBtn');
const pageInfoBtn = document.getElementById('pageInfoBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const highlightBtn = document.getElementById('highlightBtn');
const commandCategory = document.getElementById('commandCategory');
const commandMethod = document.getElementById('commandMethod');
const commandArgs = document.getElementById('commandArgs');
const executeBtn = document.getElementById('executeBtn');
const clearOutputBtn = document.getElementById('clearOutputBtn');
const outputArea = document.getElementById('outputArea');
const elementInfoPanel = document.getElementById('elementInfoPanel');
const elementInfo = document.getElementById('elementInfo');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkConnectionState();
  populateMethods();
  setupEventListeners();
});

// Check current connection state
async function checkConnectionState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getConnectionState' });
    updateConnectionUI(response?.isConnected || false);
  } catch (error) {
    console.error('Failed to get connection state:', error);
  }
}

// Update connection UI
function updateConnectionUI(connected) {
  isConnected = connected;

  if (connected) {
    connectionStatus.className = 'connection-status connected';
    connectionStatus.querySelector('.status-text').textContent = 'Connected';
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
  } else {
    connectionStatus.className = 'connection-status';
    connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
  }
}

// Populate methods dropdown based on category
function populateMethods() {
  const category = commandCategory.value;
  const methods = METHODS[category] || [];

  commandMethod.innerHTML = methods
    .map(m => `<option value="${m}">${m}</option>`)
    .join('');
}

// Setup event listeners
function setupEventListeners() {
  // Connection buttons
  connectBtn.addEventListener('click', handleConnect);
  disconnectBtn.addEventListener('click', handleDisconnect);
  settingsBtn.addEventListener('click', openSettings);

  // Quick actions
  pickerBtn.addEventListener('click', startPicker);
  pageInfoBtn.addEventListener('click', getPageInfo);
  screenshotBtn.addEventListener('click', takeScreenshot);
  highlightBtn.addEventListener('click', highlightElement);

  // Console
  commandCategory.addEventListener('change', populateMethods);
  executeBtn.addEventListener('click', executeCommand);
  clearOutputBtn.addEventListener('click', clearOutput);

  // Listen for connection state changes
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'connectionStateChanged') {
      updateConnectionUI(message.isConnected);
    }
  });
}

// Handle connect
async function handleConnect() {
  connectionStatus.className = 'connection-status connecting';
  connectionStatus.querySelector('.status-text').textContent = 'Connecting...';

  try {
    await chrome.runtime.sendMessage({ type: 'connect' });
    log('Attempting to connect to API...', 'info');
  } catch (error) {
    log(`Connection failed: ${error.message}`, 'error');
    updateConnectionUI(false);
  }
}

// Handle disconnect
async function handleDisconnect() {
  try {
    await chrome.runtime.sendMessage({ type: 'disconnect' });
    log('Disconnected from API', 'info');
    updateConnectionUI(false);
  } catch (error) {
    log(`Disconnect failed: ${error.message}`, 'error');
  }
}

// Open settings/options page
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Start element picker
async function startPicker() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: 'startPicker' });
    log('Element picker activated. Click on any element.', 'info');
    window.close(); // Close popup to allow selection
  } catch (error) {
    log(`Failed to start picker: ${error.message}`, 'error');
  }
}

// Get page info
async function getPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'getPageInfo' });
    log(JSON.stringify(result, null, 2), 'success');
  } catch (error) {
    log(`Failed to get page info: ${error.message}`, 'error');
  }
}

// Take screenshot
async function takeScreenshot() {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    log('Screenshot captured!', 'success');

    // Create download link
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();

    log('Screenshot downloaded', 'info');
  } catch (error) {
    log(`Screenshot failed: ${error.message}`, 'error');
  }
}

// Highlight element
async function highlightElement() {
  const selector = prompt('Enter CSS selector to highlight:');
  if (!selector) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'highlight',
      payload: { selector, color: 'red', duration: 3000 }
    });
    log(`Highlighting: ${selector}`, 'info');
  } catch (error) {
    log(`Failed to highlight: ${error.message}`, 'error');
  }
}

// Execute command
async function executeCommand() {
  const category = commandCategory.value;
  const method = commandMethod.value;
  const argsText = commandArgs.value.trim();

  let args = [];
  if (argsText) {
    try {
      args = JSON.parse(argsText);
      if (!Array.isArray(args)) {
        args = [args];
      }
    } catch (error) {
      log(`Invalid JSON arguments: ${error.message}`, 'error');
      return;
    }
  }

  const command = `${category}.${method}`;
  log(`Executing: ${command}(${JSON.stringify(args)})`, 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'domCommand',
      command,
      payload: { args }
    });

    if (result.error) {
      log(`Error: ${result.error}`, 'error');
    } else {
      log(JSON.stringify(result.result, null, 2), 'success');
    }
  } catch (error) {
    log(`Execution failed: ${error.message}`, 'error');
  }
}

// Clear output
function clearOutput() {
  outputArea.innerHTML = '<p class="output-placeholder">Execute a command to see results...</p>';
}

// Log to output area
function log(message, type = 'info') {
  // Remove placeholder if present
  const placeholder = outputArea.querySelector('.output-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `output-${type}`;
  entry.innerHTML = `<span class="output-timestamp">[${timestamp}]</span>${escapeHtml(message)}`;

  outputArea.appendChild(entry);
  outputArea.scrollTop = outputArea.scrollHeight;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Display element info
function displayElementInfo(info) {
  if (!info) {
    elementInfoPanel.style.display = 'none';
    return;
  }

  elementInfoPanel.style.display = 'block';
  elementInfo.innerHTML = `
    <div class="element-info-row">
      <span class="element-info-label">Tag:</span>
      <span class="element-info-value">${info.tagName}</span>
    </div>
    ${info.id ? `
    <div class="element-info-row">
      <span class="element-info-label">ID:</span>
      <span class="element-info-value">#${info.id}</span>
    </div>
    ` : ''}
    ${info.className ? `
    <div class="element-info-row">
      <span class="element-info-label">Class:</span>
      <span class="element-info-value">.${info.className.split(' ').join('.')}</span>
    </div>
    ` : ''}
    ${info.selector ? `
    <div class="element-info-row">
      <span class="element-info-label">Selector:</span>
      <span class="element-info-value">${info.selector}</span>
    </div>
    ` : ''}
  `;
}
