# DOM Control API Browser Extension

A powerful browser extension that connects to an external API for full programmatic control over the DOM. This extension enables remote DOM manipulation, element inspection, event triggering, and much more.

## Features

- **Full DOM Control**: Select, create, modify, and delete DOM elements
- **Real-time Communication**: WebSocket support for instant command execution
- **HTTP Fallback**: Polling-based communication when WebSocket isn't available
- **Interactive Element Picker**: Visual tool to select and inspect elements
- **Comprehensive API**: 100+ methods for DOM manipulation
- **Cross-browser Support**: Works with Chrome, Edge, and other Chromium browsers

## Installation

### Development Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `browser-extension` folder
5. The extension icon should appear in your toolbar

### Building for Production

For Chrome Web Store submission, you'll need to:
1. Generate icon PNGs from the SVG (16x16, 32x32, 48x48, 128x128)
2. Zip the extension folder
3. Upload to Chrome Web Store Developer Dashboard

## Quick Start

### 1. Start the API Server

```bash
cd server
npm install
npm start
```

The server will start on `ws://localhost:8080` (WebSocket) and `http://localhost:8080` (HTTP).

### 2. Configure the Extension

1. Click the extension icon in your browser toolbar
2. Click the settings (gear) icon
3. Configure your API URL (default: `ws://localhost:8080`)
4. Click "Save Settings"

### 3. Connect

1. Click "Connect" in the popup
2. The status indicator will turn green when connected

### 4. Start Controlling the DOM

Use the command console in the popup, or send commands from the API server's REPL.

## API Reference

### Command Format

Commands are sent as JSON messages via WebSocket or HTTP:

```json
{
  "type": "execute",
  "tabId": null,
  "command": "category.method",
  "payload": {
    "args": ["argument1", "argument2"]
  }
}
```

- `type`: Message type (`execute`, `query`, `executeAll`, etc.)
- `tabId`: Target tab ID (null = active tab)
- `command`: The DOM command in format `category.method`
- `payload.args`: Array of arguments to pass to the method

### Available Categories and Methods

#### `select` - Element Selection
| Method | Arguments | Description |
|--------|-----------|-------------|
| `one` | `selector` | Get single element by CSS selector |
| `all` | `selector` | Get all matching elements |
| `byId` | `id` | Get element by ID |
| `byClass` | `className` | Get elements by class name |
| `byTag` | `tagName` | Get elements by tag name |
| `byName` | `name` | Get elements by name attribute |
| `byXPath` | `xpath` | Get elements by XPath |
| `atPoint` | `x, y` | Get element at coordinates |

#### `create` - Element Creation
| Method | Arguments | Description |
|--------|-----------|-------------|
| `element` | `tagName, attributes, content` | Create new element |
| `text` | `content` | Create text node |
| `fragment` | `html` | Create document fragment |
| `fromHTML` | `html` | Create element from HTML string |

#### `manipulate` - DOM Manipulation
| Method | Arguments | Description |
|--------|-----------|-------------|
| `append` | `parent, child` | Append child to parent |
| `prepend` | `parent, child` | Prepend child to parent |
| `insertBefore` | `newNode, refNode` | Insert before reference |
| `insertAfter` | `newNode, refNode` | Insert after reference |
| `remove` | `element` | Remove element |
| `removeAll` | `selector` | Remove all matching elements |
| `replace` | `oldNode, newNode` | Replace element |
| `clone` | `element, deep` | Clone element |
| `wrap` | `element, wrapper` | Wrap element |
| `empty` | `element` | Remove all children |

#### `content` - Content Manipulation
| Method | Arguments | Description |
|--------|-----------|-------------|
| `html` | `element, content?` | Get/set innerHTML |
| `text` | `element, content?` | Get/set textContent |
| `outer` | `element, content?` | Get/set outerHTML |
| `value` | `element, content?` | Get/set value (for inputs) |

#### `attributes` - Attribute Manipulation
| Method | Arguments | Description |
|--------|-----------|-------------|
| `get` | `element, name` | Get attribute value |
| `set` | `element, name, value` | Set attribute |
| `remove` | `element, name` | Remove attribute |
| `has` | `element, name` | Check if has attribute |
| `getAll` | `element` | Get all attributes |
| `toggle` | `element, name` | Toggle attribute |

#### `classes` - Class Manipulation
| Method | Arguments | Description |
|--------|-----------|-------------|
| `add` | `element, ...classes` | Add classes |
| `remove` | `element, ...classes` | Remove classes |
| `toggle` | `element, class` | Toggle class |
| `has` | `element, class` | Check if has class |
| `replace` | `element, old, new` | Replace class |
| `getAll` | `element` | Get all classes |

#### `style` - Style Manipulation
| Method | Arguments | Description |
|--------|-----------|-------------|
| `get` | `element, property?` | Get computed style |
| `set` | `element, prop, value` | Set style property |
| `remove` | `element, property` | Remove style property |
| `show` | `element` | Show element |
| `hide` | `element` | Hide element |
| `toggle` | `element` | Toggle visibility |
| `injectCSS` | `css, id` | Inject CSS stylesheet |
| `removeCSS` | `id` | Remove injected CSS |

#### `events` - Event Handling
| Method | Arguments | Description |
|--------|-----------|-------------|
| `click` | `element` | Trigger click |
| `focus` | `element` | Focus element |
| `blur` | `element` | Blur element |
| `trigger` | `element, event` | Trigger event |
| `mouse` | `element, type, options` | Trigger mouse event |
| `keyboard` | `element, type, key` | Trigger keyboard event |

#### `traverse` - DOM Traversal
| Method | Arguments | Description |
|--------|-----------|-------------|
| `parent` | `element` | Get parent element |
| `parents` | `element, selector?` | Get all ancestors |
| `closest` | `element, selector` | Find closest ancestor |
| `children` | `element, selector?` | Get children |
| `siblings` | `element, selector?` | Get siblings |
| `next` | `element, selector?` | Get next sibling |
| `prev` | `element, selector?` | Get previous sibling |

#### `dimensions` - Dimensions & Position
| Method | Arguments | Description |
|--------|-----------|-------------|
| `rect` | `element` | Get bounding rectangle |
| `offset` | `element` | Get offset from document |
| `scroll` | `element, x?, y?` | Get/set scroll position |
| `scrollIntoView` | `element, options` | Scroll element into view |
| `width` | `element` | Get element width |
| `height` | `element` | Get element height |

#### `form` - Form Handling
| Method | Arguments | Description |
|--------|-----------|-------------|
| `getData` | `form` | Get form data as object |
| `setData` | `form, data` | Set form data |
| `submit` | `form` | Submit form |
| `reset` | `form` | Reset form |
| `validate` | `form` | Validate form |

#### `utils` - Utilities
| Method | Arguments | Description |
|--------|-----------|-------------|
| `waitFor` | `selector, timeout` | Wait for element |
| `executeScript` | `code` | Execute JavaScript |
| `getPageInfo` | - | Get page information |
| `getLinks` | - | Get all links on page |
| `getImages` | - | Get all images on page |
| `getForms` | - | Get all forms on page |
| `highlight` | `element, color, duration` | Highlight element |

## Server REPL Commands

When running the API server, you have access to an interactive REPL:

```bash
# List connected browser clients
clients

# Execute a DOM command
exec select.one #header
exec classes.add #main active highlighted

# Query DOM and see results
query select.all div.card

# Highlight an element
highlight .important-section

# Click an element
click button.submit

# Type text into an input
type input#email test@example.com

# Get page information
pageinfo

# Capture screenshot
screenshot

# Get list of browser tabs
tabs

# Inject JavaScript
inject alert('Hello from API!')
```

## HTTP API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/commands` | GET | Get pending commands (for polling) |
| `/api/command` | POST | Submit a command |
| `/api/clients` | GET | List connected clients |
| `/api/result` | POST | Submit command result |

### Example HTTP Request

```bash
curl -X POST http://localhost:8080/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "select.one",
    "payload": { "args": ["#myElement"] }
  }'
```

## Security Considerations

1. **Authentication**: Set an `AUTH_TOKEN` environment variable on the server to require authentication
2. **Raw Execution**: The "Allow raw JavaScript execution" option is disabled by default for security
3. **Host Permissions**: The extension requests `<all_urls>` permission - review before installing
4. **Local Use**: By default, the server only accepts localhost connections

## Development

### Project Structure

```
browser-extension/
├── manifest.json          # Extension manifest
├── scripts/
│   ├── background.js      # Service worker (API communication)
│   ├── content.js         # Content script (DOM operations)
│   └── dom-controller.js  # DOM manipulation library
├── pages/
│   ├── popup.html/js      # Extension popup UI
│   └── options.html/js    # Settings page
├── styles/
│   ├── popup.css          # Popup styles
│   ├── options.css        # Options page styles
│   └── content.css        # Content script styles
├── icons/                 # Extension icons
└── server/
    ├── package.json       # Server dependencies
    └── server.js          # Mock API server
```

### Generating Icons

The `icons/icon.svg` file can be converted to PNGs using:

```bash
# Using ImageMagick
convert -background none icons/icon.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon.svg -resize 32x32 icons/icon32.png
convert -background none icons/icon.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png
```

Or use an online SVG to PNG converter.

## Use Cases

- **Automated Testing**: Control browser DOM programmatically for testing
- **Web Scraping**: Extract data from web pages
- **Accessibility Tools**: Build custom accessibility helpers
- **Browser Automation**: Create custom automation workflows
- **Developer Tools**: Build advanced debugging utilities
- **RPA (Robotic Process Automation)**: Automate repetitive web tasks

## License

MIT License - See LICENSE file for details.
