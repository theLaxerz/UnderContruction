/**
 * DOM Control API Server
 * A mock server for testing the DOM Control browser extension
 *
 * Features:
 * - WebSocket support for real-time communication
 * - HTTP REST API for polling mode
 * - Interactive REPL for sending commands
 * - Command history and logging
 */

import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createInterface } from 'readline';

const PORT = process.env.PORT || 8080;
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// Express app for HTTP fallback
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

// Connected clients
const clients = new Map();
let clientIdCounter = 0;

// Command queue for HTTP polling
const commandQueue = [];

// Results storage
const results = new Map();
let requestIdCounter = 0;

// Logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = ++clientIdCounter;
  const clientInfo = {
    id: clientId,
    ws,
    authenticated: !AUTH_TOKEN,
    ip: req.socket.remoteAddress
  };

  clients.set(clientId, clientInfo);
  log(`Client ${clientId} connected from ${clientInfo.ip}`, 'success');

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId,
    message: 'Connected to DOM Control API Server'
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleWebSocketMessage(clientInfo, message);
    } catch (error) {
      log(`Failed to parse message from client ${clientId}: ${error.message}`, 'error');
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    log(`Client ${clientId} disconnected`, 'warn');
  });

  ws.on('error', (error) => {
    log(`Client ${clientId} error: ${error.message}`, 'error');
  });
});

// Handle WebSocket messages
function handleWebSocketMessage(client, message) {
  const { type } = message;

  switch (type) {
    case 'auth':
      if (AUTH_TOKEN && message.token !== AUTH_TOKEN) {
        client.ws.send(JSON.stringify({ type: 'error', message: 'Invalid auth token' }));
        client.ws.close();
        return;
      }
      client.authenticated = true;
      client.ws.send(JSON.stringify({ type: 'authSuccess' }));
      log(`Client ${client.id} authenticated`, 'success');
      break;

    case 'domResult':
    case 'queryResult':
    case 'screenshotResult':
    case 'tabsResult':
      log(`Received result from client ${client.id}: ${type}`, 'info');
      console.log(JSON.stringify(message, null, 2));

      if (message.requestId) {
        results.set(message.requestId, message);
      }
      break;

    case 'contentScriptReady':
      log(`Content script ready on: ${message.url}`, 'info');
      break;

    default:
      log(`Unknown message type from client ${client.id}: ${type}`, 'warn');
  }
}

// Broadcast message to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.authenticated && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

// Send command to extension
function sendCommand(command, payload = {}, tabId = null) {
  const requestId = ++requestIdCounter;

  const message = {
    type: 'execute',
    requestId,
    tabId,
    command,
    payload
  };

  log(`Sending command: ${command}`, 'info');
  broadcast(message);

  // Also add to HTTP queue for polling clients
  commandQueue.push(message);

  return requestId;
}

// Query DOM and wait for result
async function queryDOM(command, payload = {}, tabId = null, timeout = 5000) {
  const requestId = ++requestIdCounter;

  const message = {
    type: 'query',
    requestId,
    tabId,
    command,
    payload
  };

  log(`Querying DOM: ${command}`, 'info');
  broadcast(message);

  // Wait for result
  return new Promise((resolve, reject) => {
    const checkResult = setInterval(() => {
      if (results.has(requestId)) {
        clearInterval(checkResult);
        const result = results.get(requestId);
        results.delete(requestId);
        resolve(result);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkResult);
      reject(new Error('Query timed out'));
    }, timeout);
  });
}

// HTTP REST API endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    clients: clients.size,
    uptime: process.uptime()
  });
});

// Get pending commands (for polling)
app.get('/api/commands', (req, res) => {
  if (AUTH_TOKEN) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== AUTH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const commands = [...commandQueue];
  commandQueue.length = 0;
  res.json(commands);
});

// Submit command via HTTP
app.post('/api/command', (req, res) => {
  if (AUTH_TOKEN) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== AUTH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { command, payload, tabId } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const requestId = sendCommand(command, payload || {}, tabId);
  res.json({ success: true, requestId });
});

// Get connected clients
app.get('/api/clients', (req, res) => {
  const clientList = Array.from(clients.values()).map(c => ({
    id: c.id,
    authenticated: c.authenticated,
    ip: c.ip
  }));
  res.json(clientList);
});

// Submit result via HTTP
app.post('/api/result', (req, res) => {
  const { requestId, result } = req.body;

  if (requestId) {
    results.set(requestId, result);
  }

  res.json({ success: true });
});

// Start server
server.listen(PORT, () => {
  log(`DOM Control API Server running on port ${PORT}`, 'success');
  log(`WebSocket: ws://localhost:${PORT}`, 'info');
  log(`HTTP API: http://localhost:${PORT}`, 'info');
  log('', 'info');
  log('Available commands:', 'info');
  log('  help                     - Show this help', 'info');
  log('  clients                  - List connected clients', 'info');
  log('  exec <cmd> [args]        - Execute DOM command', 'info');
  log('  query <cmd> [args]       - Query DOM and get result', 'info');
  log('  tabs                     - Get list of tabs', 'info');
  log('  screenshot               - Capture screenshot', 'info');
  log('  inject <js>              - Inject JavaScript', 'info');
  log('', 'info');
  startREPL();
});

// Interactive REPL
function startREPL() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[35mdom-control>\x1b[0m '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    const [cmd, ...args] = trimmed.split(' ');

    try {
      switch (cmd.toLowerCase()) {
        case 'help':
          console.log(`
Available commands:
  help                     - Show this help
  clients                  - List connected clients
  exec <cmd> [args]        - Execute DOM command (e.g., exec select.one #header)
  query <cmd> [args]       - Query DOM and get result
  tabs                     - Get list of browser tabs
  screenshot               - Capture visible tab screenshot
  inject <code>            - Inject and execute JavaScript
  highlight <selector>     - Highlight an element
  click <selector>         - Click an element
  type <selector> <text>   - Type text into an input
  scroll <x> <y>           - Scroll the page
  pageinfo                 - Get page information
  exit                     - Exit the server

Examples:
  exec select.one body
  query select.all div.card
  highlight #main-content
  click button.submit
  type input#email test@example.com
`);
          break;

        case 'clients':
          console.log('\nConnected clients:');
          for (const client of clients.values()) {
            console.log(`  [${client.id}] IP: ${client.ip}, Auth: ${client.authenticated}`);
          }
          if (clients.size === 0) {
            console.log('  No clients connected');
          }
          console.log('');
          break;

        case 'exec':
          if (args.length < 1) {
            console.log('Usage: exec <command> [args...]');
            console.log('Example: exec select.one #myElement');
          } else {
            const [command, ...cmdArgs] = args;
            sendCommand(command, { args: cmdArgs.length ? cmdArgs : [] });
          }
          break;

        case 'query':
          if (args.length < 1) {
            console.log('Usage: query <command> [args...]');
          } else {
            const [command, ...cmdArgs] = args;
            try {
              const result = await queryDOM(command, { args: cmdArgs.length ? cmdArgs : [] });
              console.log('\nResult:');
              console.log(JSON.stringify(result, null, 2));
            } catch (error) {
              console.log('Error:', error.message);
            }
          }
          break;

        case 'tabs':
          broadcast({ type: 'getTabs', requestId: ++requestIdCounter });
          log('Requested tabs list', 'info');
          break;

        case 'screenshot':
          broadcast({ type: 'screenshot', requestId: ++requestIdCounter });
          log('Requested screenshot', 'info');
          break;

        case 'inject':
          if (args.length < 1) {
            console.log('Usage: inject <javascript code>');
          } else {
            sendCommand('utils.executeScript', { args: [args.join(' ')] });
          }
          break;

        case 'highlight':
          if (args.length < 1) {
            console.log('Usage: highlight <selector>');
          } else {
            sendCommand('utils.highlight', { args: [args[0], 'red', 3000] });
          }
          break;

        case 'click':
          if (args.length < 1) {
            console.log('Usage: click <selector>');
          } else {
            sendCommand('events.click', { args: [args[0]] });
          }
          break;

        case 'type':
          if (args.length < 2) {
            console.log('Usage: type <selector> <text>');
          } else {
            const selector = args[0];
            const text = args.slice(1).join(' ');
            sendCommand('content.value', { args: [selector, text] });
          }
          break;

        case 'scroll':
          const x = parseInt(args[0]) || 0;
          const y = parseInt(args[1]) || 0;
          sendCommand('dimensions.scroll', { args: [null, x, y] });
          break;

        case 'pageinfo':
          sendCommand('utils.getPageInfo', { args: [] });
          break;

        case 'exit':
        case 'quit':
          console.log('Shutting down...');
          process.exit(0);
          break;

        default:
          console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
      }
    } catch (error) {
      console.log('Error:', error.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}
