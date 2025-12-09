/**
 * Content Script - Receives commands and executes DOM operations
 * Works with the DOMController API to manipulate the page
 */

// Command executor - maps command names to DOMController methods
const CommandExecutor = {
  // Execute a command with given parameters
  execute(command, payload) {
    const [category, method] = command.split('.');

    if (!category || !method) {
      return { error: `Invalid command format: ${command}` };
    }

    const controller = window.DOMController;
    if (!controller) {
      return { error: 'DOMController not available' };
    }

    const categoryObj = controller[category];
    if (!categoryObj) {
      return { error: `Unknown category: ${category}` };
    }

    const methodFn = categoryObj[method];
    if (typeof methodFn !== 'function') {
      return { error: `Unknown method: ${method} in category ${category}` };
    }

    try {
      // Convert payload to arguments
      const args = payload.args || [];
      const result = methodFn.apply(categoryObj, args);

      // Serialize result if it's a DOM element
      if (result instanceof Element) {
        return { success: true, result: serializeElement(result) };
      } else if (result instanceof NodeList || Array.isArray(result)) {
        return {
          success: true,
          result: Array.from(result).map(item =>
            item instanceof Element ? serializeElement(item) : item
          )
        };
      }

      return { success: true, result };
    } catch (error) {
      return { error: error.message, stack: error.stack };
    }
  },

  // Execute multiple commands in sequence
  async executeSequence(commands) {
    const results = [];
    for (const { command, payload } of commands) {
      const result = this.execute(command, payload);
      results.push({ command, result });
      if (result.error) break;
    }
    return results;
  },

  // Execute a raw JavaScript expression
  executeRaw(code) {
    try {
      const result = new Function('DOMController', `return ${code}`)(window.DOMController);

      if (result instanceof Element) {
        return { success: true, result: serializeElement(result) };
      }

      return { success: true, result };
    } catch (error) {
      return { error: error.message, stack: error.stack };
    }
  }
};

// Serialize DOM element to plain object
function serializeElement(element) {
  if (!element) return null;

  try {
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 500),
      attributes: Array.from(element.attributes || []).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}),
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      },
      childCount: element.children?.length || 0,
      visible: isElementVisible(element)
    };
  } catch (error) {
    return { error: 'Failed to serialize element', message: error.message };
  }
}

// Check if element is visible
function isElementVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0
  );
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ error: error.message }));

  return true; // Keep channel open for async response
});

// Handle incoming messages
async function handleMessage(message) {
  const { type, command, payload } = message;

  switch (type) {
    case 'domCommand':
      return CommandExecutor.execute(command, payload || {});

    case 'domQuery':
      return executeQuery(command, payload || {});

    case 'domSequence':
      return CommandExecutor.executeSequence(payload.commands || []);

    case 'domRaw':
      return CommandExecutor.executeRaw(payload.code);

    case 'getPageInfo':
      return window.DOMController.utils.getPageInfo();

    case 'getElements':
      return getElementsInfo(payload.selector);

    case 'highlight':
      window.DOMController.utils.highlight(payload.selector, payload.color, payload.duration);
      return { success: true };

    case 'clearHighlights':
      window.DOMController.utils.clearHighlights();
      return { success: true };

    case 'ping':
      return { pong: true, url: window.location.href };

    default:
      return { error: `Unknown message type: ${type}` };
  }
}

// Execute a query and return serialized results
function executeQuery(command, payload) {
  const result = CommandExecutor.execute(command, payload);

  // Add extra information for queries
  if (result.success && result.result) {
    if (Array.isArray(result.result)) {
      result.count = result.result.length;
    }
  }

  return result;
}

// Get information about elements matching selector
function getElementsInfo(selector) {
  const elements = document.querySelectorAll(selector);
  return {
    success: true,
    count: elements.length,
    elements: Array.from(elements).slice(0, 100).map(serializeElement)
  };
}

// Interactive element picker
let elementPickerActive = false;
let elementPickerCallback = null;

function startElementPicker() {
  if (elementPickerActive) return;

  elementPickerActive = true;

  const overlay = document.createElement('div');
  overlay.id = 'dom-control-picker-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999999;
    cursor: crosshair;
    background: transparent;
  `;

  const highlight = document.createElement('div');
  highlight.id = 'dom-control-picker-highlight';
  highlight.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 999998;
    background: rgba(66, 133, 244, 0.3);
    border: 2px solid #4285f4;
    transition: all 0.1s ease;
  `;

  const tooltip = document.createElement('div');
  tooltip.id = 'dom-control-picker-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    z-index: 1000000;
    background: #333;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    pointer-events: none;
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(highlight);
  document.body.appendChild(tooltip);

  let currentElement = null;

  overlay.addEventListener('mousemove', (e) => {
    const target = document.elementFromPoint(e.clientX, e.clientY);

    if (target && target !== overlay && target !== highlight && target !== tooltip) {
      currentElement = target;
      const rect = target.getBoundingClientRect();

      highlight.style.top = rect.top + 'px';
      highlight.style.left = rect.left + 'px';
      highlight.style.width = rect.width + 'px';
      highlight.style.height = rect.height + 'px';

      const selector = generateSelector(target);
      tooltip.textContent = selector;
      tooltip.style.top = (e.clientY + 15) + 'px';
      tooltip.style.left = (e.clientX + 15) + 'px';
    }
  });

  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (currentElement) {
      const result = {
        element: serializeElement(currentElement),
        selector: generateSelector(currentElement),
        xpath: generateXPath(currentElement)
      };

      // Send result back
      chrome.runtime.sendMessage({
        type: 'domResult',
        result: { pickerResult: result }
      });
    }

    stopElementPicker();
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopElementPicker();
    }
  });
}

function stopElementPicker() {
  elementPickerActive = false;
  document.getElementById('dom-control-picker-overlay')?.remove();
  document.getElementById('dom-control-picker-highlight')?.remove();
  document.getElementById('dom-control-picker-tooltip')?.remove();
}

// Generate CSS selector for element
function generateSelector(element) {
  if (!element) return '';

  if (element.id) {
    return `#${element.id}`;
  }

  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.');
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Generate XPath for element
function generateXPath(element) {
  if (!element) return '';

  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const path = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    path.unshift(`${tagName}[${index}]`);
    current = current.parentElement;
  }

  return '/' + path.join('/');
}

// Listen for picker activation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startPicker') {
    startElementPicker();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'stopPicker') {
    stopElementPicker();
    sendResponse({ success: true });
    return true;
  }
});

// Notify background script that content script is ready
chrome.runtime.sendMessage({
  type: 'contentScriptReady',
  url: window.location.href
}).catch(() => {
  // Background might not be listening yet
});

// Log initialization
console.log('DOM Control API: Content script initialized on', window.location.href);
