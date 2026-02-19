require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3456;
const TOKEN = process.env.API_TOKEN || 'alice-secret-2026';
const OC_WS = process.env.OPENCLAW_WS || 'ws://127.0.0.1:18789';
const WORKSPACE = '/Users/akrom/.openclaw/workspace';

app.use(cors());
app.use(express.json());

// Auth middleware
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Helper: send a WS RPC call to OpenClaw gateway
function ocRpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(OC_WS);
    const id = Date.now().toString();
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout'));
    }, 10000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          clearTimeout(timeout);
          ws.close();
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch {}
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// System stats
function getSystemStats() {
  try {
    const totalMem = parseInt(execSync('/usr/sbin/sysctl -n hw.memsize').toString().trim());
    const vmStat = execSync('/usr/bin/vm_stat').toString();
    const pageSize = 16384;
    const parse = (key) => {
      const m = vmStat.match(new RegExp(`${key}:\\s+(\\d+)`));
      return m ? parseInt(m[1]) * pageSize : 0;
    };
    const free = parse('Pages free') + parse('Pages purgeable');
    const used = totalMem - free;
    const cpu = execSync("/usr/bin/top -l 1 -n 0 | grep 'CPU usage'").toString().trim();
    const cpuMatch = cpu.match(/([\d.]+)% idle/);
    const cpuUsage = cpuMatch ? (100 - parseFloat(cpuMatch[1])).toFixed(1) : '?';
    const disk = execSync("/bin/df -g / | tail -1").toString().trim().split(/\s+/);
    const uptime = execSync('/usr/bin/uptime').toString().trim();

    return {
      ram: { total: totalMem, used, free, totalGB: (totalMem / 1073741824).toFixed(1), usedGB: (used / 1073741824).toFixed(1), freeGB: (free / 1073741824).toFixed(1), percent: ((used / totalMem) * 100).toFixed(1) },
      cpu: { usage: cpuUsage + '%' },
      disk: { totalGB: disk[1], usedGB: disk[2], freeGB: disk[3] },
      uptime,
    };
  } catch { return null; }
}

// Status endpoint (used for login validation)
app.get('/api/status', (req, res) => {
  const stats = getSystemStats();
  res.json({ ok: true, agent: 'Alice', status: 'online', timestamp: new Date().toISOString(), system: stats });
});

app.post('/api/status', (req, res) => {
  const stats = getSystemStats();
  res.json({ ok: true, agent: 'Alice', status: 'online', timestamp: new Date().toISOString(), system: stats });
});

// Sessions list
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await ocRpc('chat.history', {});
    res.json({ ok: true, sessions: result });
  } catch {
    // Fallback: read from workspace files
    res.json({ ok: true, sessions: [] });
  }
});

// Skills list
app.get('/api/skills', (req, res) => {
  const skillsDir = '/opt/homebrew/lib/node_modules/openclaw/skills';
  try {
    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const skillPath = path.join(skillsDir, d.name, 'SKILL.md');
        let description = '';
        try {
          const content = fs.readFileSync(skillPath, 'utf8');
          const descMatch = content.match(/description[:\s]*["']?([^\n"']+)/i);
          if (descMatch) description = descMatch[1].trim();
        } catch {}
        return { name: d.name, description, location: skillPath };
      });
    res.json({ ok: true, skills: dirs });
  } catch {
    res.json({ ok: true, skills: [] });
  }
});

// Memory / Notes
app.get('/api/notes', (req, res) => {
  const memDir = path.join(WORKSPACE, 'memory');
  try {
    const files = fs.readdirSync(memDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 30)
      .map(f => ({
        name: f,
        date: f.replace('.md', ''),
        content: fs.readFileSync(path.join(memDir, f), 'utf8'),
      }));
    res.json({ ok: true, notes: files });
  } catch {
    res.json({ ok: true, notes: [] });
  }
});

// Read a specific file
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !filePath.startsWith(WORKSPACE)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ ok: true, content });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

// Write a note
app.post('/api/notes', (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });
  const memDir = path.join(WORKSPACE, 'memory');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });
  const filePath = path.join(memDir, filename);
  if (!filePath.startsWith(memDir)) return res.status(400).json({ error: 'Invalid path' });
  fs.writeFileSync(filePath, content);
  res.json({ ok: true });
});

// Gateway config (read-only)
app.get('/api/config', (req, res) => {
  try {
    const raw = fs.readFileSync('/Users/akrom/.openclaw/openclaw.json', 'utf8');
    const config = JSON.parse(raw);
    // Redact sensitive fields
    if (config.channels?.telegram?.botToken) config.channels.telegram.botToken = '***';
    if (config.tools?.web?.search?.apiKey) config.tools.web.search.apiKey = '***';
    res.json({ ok: true, config });
  } catch {
    res.status(500).json({ error: 'Could not read config' });
  }
});

// Send message to Alice (main session via Telegram-like interface)
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });
  try {
    const result = await ocRpc('chat.send', { text: message });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Alice API server running on port ${PORT}`);
  console.log(`Auth token: ${TOKEN}`);
});
