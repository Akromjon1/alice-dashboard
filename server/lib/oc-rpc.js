const WebSocket = require('ws');

const OC_WS = process.env.OPENCLAW_WS || 'ws://127.0.0.1:18789';

let ws = null;
let pendingCalls = new Map();
let reconnectTimer = null;
let idCounter = 0;

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(OC_WS);

  ws.on('open', () => {
    console.log('[oc-rpc] Connected to OpenClaw gateway');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.id && pendingCalls.has(msg.id)) {
        const { resolve, reject, timer } = pendingCalls.get(msg.id);
        clearTimeout(timer);
        pendingCalls.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    } catch {}
  });

  ws.on('close', () => {
    ws = null;
    scheduleReconnect();
  });

  ws.on('error', () => {
    try { ws.close(); } catch {}
    ws = null;
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

function ocRpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
      // Wait briefly for connection
      const waitTimer = setTimeout(() => reject(new Error('WebSocket not connected')), 5000);
      const checkInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          clearTimeout(waitTimer);
          clearInterval(checkInterval);
          sendCall(method, params, resolve, reject);
        }
      }, 100);
      return;
    }
    sendCall(method, params, resolve, reject);
  });
}

function sendCall(method, params, resolve, reject) {
  const id = String(++idCounter);
  const timer = setTimeout(() => {
    pendingCalls.delete(id);
    reject(new Error('Timeout'));
  }, 10000);

  pendingCalls.set(id, { resolve, reject, timer });
  ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
}

// Start initial connection
connect();

module.exports = { ocRpc };
