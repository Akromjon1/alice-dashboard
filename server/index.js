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

// YouTube channels & videos
app.get('/api/youtube', (req, res) => {
  const tubePath = path.join(WORKSPACE, 'data/tube.json');
  try {
    const data = JSON.parse(fs.readFileSync(tubePath, 'utf8'));
    res.json({ ok: true, ...data });
  } catch {
    res.json({ ok: true, channels: [], videos: [] });
  }
});

app.post('/api/youtube/channel', (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Missing name or url' });
  const tubePath = path.join(WORKSPACE, 'data/tube.json');
  let data = { channels: [], videos: [] };
  try { data = JSON.parse(fs.readFileSync(tubePath, 'utf8')); } catch {}
  data.channels.push({ name, url, addedAt: new Date().toISOString().split('T')[0] });
  fs.writeFileSync(tubePath, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

app.delete('/api/youtube/channel', (req, res) => {
  const { url } = req.body;
  const tubePath = path.join(WORKSPACE, 'data/tube.json');
  try {
    const data = JSON.parse(fs.readFileSync(tubePath, 'utf8'));
    data.channels = data.channels.filter(c => c.url !== url);
    fs.writeFileSync(tubePath, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/youtube/video', (req, res) => {
  const { title, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Missing title or url' });
  const tubePath = path.join(WORKSPACE, 'data/tube.json');
  let data = { channels: [], videos: [] };
  try { data = JSON.parse(fs.readFileSync(tubePath, 'utf8')); } catch {}
  if (!data.videos) data.videos = [];
  data.videos.push({ title, url, addedAt: new Date().toISOString().split('T')[0] });
  fs.writeFileSync(tubePath, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

// Agents / Sessions management
app.get('/api/agents', (req, res) => {
  const agents = [];
  
  // Helper: get model tier from full model string
  function getModelTier(model) {
    if (!model) return null;
    if (model.includes('opus')) return 'opus';
    if (model.includes('sonnet')) return 'sonnet';
    if (model.includes('haiku')) return 'haiku';
    return 'local';
  }

  // Read model-roles.json for role-based agents
  let roles = [];
  try {
    const rolesData = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'data/model-roles.json'), 'utf8'));
    roles = rolesData.roles || [];
  } catch {}

  // Map role IDs to existing agent types/statuses
  const roleTypeMap = {
    'coding': 'pipeline',
    'alice-main': 'main',
    'tester': 'pipeline',
    'research': 'utility',
    'matches': 'watcher',
    'youtube': 'watcher',
    'cron': 'system',
  };

  const pipelineIds = new Set(['coding', 'tester']);
  const today = new Date().toISOString().split('T')[0];

  // Get last active date from memory files
  let lastActiveDate = 'unknown';
  try {
    const memDir = path.join(WORKSPACE, 'memory');
    const files = fs.readdirSync(memDir).filter(f => f.endsWith('.md'));
    const todayFile = files.find(f => f.includes(today));
    lastActiveDate = todayFile ? today : files[files.length - 1]?.replace('.md', '') || 'unknown';
  } catch {}

  // Build agents from roles
  for (const role of roles) {
    const tier = getModelTier(role.model);
    const agentType = roleTypeMap[role.id] || 'utility';
    let status = 'running';
    let description = role.description;
    let lastActive = lastActiveDate;

    // Override status/description for specific agents
    if (pipelineIds.has(role.id)) {
      status = 'ready';
      lastActive = 'on-demand';
    }

    if (role.id === 'youtube') {
      try {
        const tube = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'data/tube.json'), 'utf8'));
        status = tube.channels?.length > 0 ? 'running' : 'stopped';
        description = `Tracking ${tube.channels?.length || 0} channels, ${tube.videos?.length || 0} videos`;
        lastActive = tube.channels?.[tube.channels.length - 1]?.addedAt || 'unknown';
      } catch { status = 'stopped'; }
    }

    if (role.id === 'matches') {
      try {
        const matches = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'data/matches.json'), 'utf8'));
        status = matches.teams?.length > 0 ? 'running' : 'stopped';
        description = `Tracking ${matches.teams?.length || 0} teams`;
        lastActive = matches.teams?.[matches.teams.length - 1]?.addedAt || 'unknown';
      } catch { status = 'stopped'; description = 'No teams tracked yet'; }
    }

    if (role.id === 'cron') {
      try {
        const hb = fs.readFileSync(path.join(WORKSPACE, 'HEARTBEAT.md'), 'utf8');
        const hasContent = hb.replace(/[#\s\n]/g, '').replace(/keepthisfileempty.*/i, '').trim().length > 0;
        status = hasContent ? 'running' : 'standby';
        lastActive = 'continuous';
      } catch { status = 'standby'; }
    }

    if (role.id === 'research') {
      status = 'standby';
      lastActive = 'on-demand';
    }

    agents.push({
      id: role.id,
      name: role.name,
      icon: role.icon,
      type: agentType,
      status,
      description,
      lastActive,
      model: role.model,
      modelTier: tier,
      isPipeline: pipelineIds.has(role.id) || role.id === 'alice-main',
    });
  }

  res.json({ ok: true, agents });
});

// Cron jobs — scan all possible locations
app.get('/api/cron', (req, res) => {
  let jobs = [];
  try {
    const searchPaths = [
      '/Users/akrom/.openclaw/cron/jobs.json',
      '/Users/akrom/.openclaw/cron-jobs.json',
      '/Users/akrom/.openclaw/state/cron-jobs.json',
    ];
    
    // Also search recursively in .openclaw for any cron files
    const findCronFiles = (dir, depth = 0) => {
      if (depth > 3) return [];
      const results = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(dir, e.name);
          if (e.isFile() && e.name.includes('cron') && e.name.endsWith('.json')) results.push(full);
          if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
            results.push(...findCronFiles(full, depth + 1));
          }
        }
      } catch {}
      return results;
    };
    
    const allPaths = [...new Set([...searchPaths, ...findCronFiles('/Users/akrom/.openclaw')])];
    
    for (const p of allPaths) {
      if (fs.existsSync(p)) {
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (Array.isArray(data) && data.length > 0) { jobs = data; break; }
          if (data.jobs && data.jobs.length > 0) { jobs = data.jobs; break; }
        } catch {}
      }
    }

    res.json({ ok: true, jobs, scanned: allPaths.filter(p => fs.existsSync(p)) });
  } catch (err) {
    res.json({ ok: true, jobs: [], error: err.message });
  }
});

// Matches data
app.get('/api/matches', (req, res) => {
  const matchesPath = path.join(WORKSPACE, 'data/matches.json');
  try {
    const data = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
    res.json({ ok: true, ...data });
  } catch {
    res.json({ ok: true, matches: [], teams: [] });
  }
});

app.get('/api/ufc', (req, res) => {
  const matchesPath = path.join(WORKSPACE, 'data/matches.json');
  try {
    const data = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
    res.json({ ok: true, events: data.ufc || [] });
  } catch {
    res.json({ ok: true, events: [] });
  }
});

app.post('/api/matches/team', (req, res) => {
  const { name, league } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing team name' });
  const matchesPath = path.join(WORKSPACE, 'data/matches.json');
  let data = { teams: [], matches: [] };
  try { data = JSON.parse(fs.readFileSync(matchesPath, 'utf8')); } catch {}
  if (!data.teams) data.teams = [];
  data.teams.push({ name, league: league || '', addedAt: new Date().toISOString().split('T')[0] });
  const dataDir = path.dirname(matchesPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(matchesPath, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

app.delete('/api/matches/team', (req, res) => {
  const { name } = req.body;
  const matchesPath = path.join(WORKSPACE, 'data/matches.json');
  try {
    const data = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
    data.teams = (data.teams || []).filter(t => t.name !== name);
    fs.writeFileSync(matchesPath, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Model role assignments
const MODEL_ROLES_PATH = path.join(WORKSPACE, 'data/model-roles.json');

app.get('/api/model-roles', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(MODEL_ROLES_PATH, 'utf8'));
    res.json({ ok: true, roles: data.roles || [] });
  } catch {
    res.json({ ok: true, roles: [] });
  }
});

app.post('/api/model-roles', (req, res) => {
  const { roles } = req.body;
  if (!Array.isArray(roles)) return res.status(400).json({ error: 'Missing roles array' });
  
  const dataDir = path.dirname(MODEL_ROLES_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const data = { roles, updatedAt: new Date().toISOString() };
  fs.writeFileSync(MODEL_ROLES_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

// Activity feed — parse OpenClaw sessions for recent agent runs
app.get('/api/activity', (req, res) => {
  const sessionsDir = '/Users/akrom/.openclaw/agents/main/sessions';
  const activities = [];

  // Read model-roles for name/icon mapping
  let roles = [];
  try {
    roles = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'data/model-roles.json'), 'utf8')).roles || [];
  } catch {}

  function getModelTier(model) {
    if (!model) return 'unknown';
    if (model.includes('opus')) return 'opus';
    if (model.includes('sonnet')) return 'sonnet';
    if (model.includes('haiku')) return 'haiku';
    return 'other';
  }

  function agentFromModel(tier) {
    const role = roles.find(r => getModelTier(r.model) === tier);
    return role ? { name: role.name, icon: role.icon } : { name: 'Agent', icon: '🤖' };
  }

  function formatRuntime(ms) {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  }

  try {
    // Read sessions.json for metadata
    const sessionsData = JSON.parse(fs.readFileSync(path.join(sessionsDir, 'sessions.json'), 'utf8'));

    for (const [key, meta] of Object.entries(sessionsData)) {
      // Skip the main session, only show subagents and cron runs
      if (key === 'agent:main:main') continue;

      const sessionId = meta.sessionId;
      const jsonlPath = path.join(sessionsDir, `${sessionId}.jsonl`);
      if (!fs.existsSync(jsonlPath)) continue;

      const stat = fs.statSync(jsonlPath);
      const lockExists = fs.existsSync(jsonlPath + '.lock');

      // Read first few lines for session info and task
      let task = meta.label || '';
      let model = meta.model || '';
      let startedAt = null;
      let completedAt = null;
      let status = 'completed';

      try {
        const content = fs.readFileSync(jsonlPath, 'utf8');
        const lines = content.split('\n').filter(Boolean);

        // Parse first line for timestamp
        if (lines.length > 0) {
          try {
            const first = JSON.parse(lines[0]);
            startedAt = first.timestamp;
          } catch {}
        }

        // Check first user message for task description
        if (!task) {
          for (const line of lines.slice(0, 10)) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'message' && obj.message?.role === 'user') {
                const text = typeof obj.message.content === 'string'
                  ? obj.message.content
                  : obj.message.content?.find(c => c.type === 'text')?.text || '';
                task = text.slice(0, 120).split('\n')[0];
                break;
              }
            } catch {}
          }
        }

        // Check model from jsonl
        if (!model) {
          for (const line of lines.slice(0, 5)) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'model_change') {
                model = obj.modelId || '';
                break;
              }
            } catch {}
          }
        }

        // Determine status: if lock file exists, it's running
        if (lockExists) {
          status = 'running';
          completedAt = null;
        } else {
          completedAt = stat.mtime.toISOString();
          // Check last lines for errors
          const lastLines = lines.slice(-5);
          for (const line of lastLines) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'error' || (obj.message?.content && typeof obj.message.content === 'string' && obj.message.content.includes('Error'))) {
                status = 'failed';
              }
            } catch {}
          }
        }
      } catch {}

      const tier = getModelTier(model);
      const agentInfo = agentFromModel(tier);

      // Use label-based agent detection
      let agentName = agentInfo.name;
      let agentIcon = agentInfo.icon;
      const label = (meta.label || '').toLowerCase();
      if (label.includes('coder') || label.includes('coding')) { agentName = 'Coding'; agentIcon = '💻'; }
      else if (label.includes('qa') || label.includes('tester')) { agentName = 'QA Tester'; agentIcon = '🧪'; }
      else if (label.includes('research')) { agentName = 'Research'; agentIcon = '🔍'; }
      else if (label.includes('cron') || label.includes('match')) { agentName = 'Cron Jobs'; agentIcon = '⏰'; }

      const startMs = startedAt ? new Date(startedAt).getTime() : stat.birthtimeMs;
      const endMs = completedAt ? new Date(completedAt).getTime() : Date.now();

      activities.push({
        id: sessionId,
        agent: agentName,
        task: task.slice(0, 120) || 'No description',
        status,
        model: tier,
        startedAt: startedAt || stat.birthtime.toISOString(),
        completedAt: status === 'running' ? null : completedAt,
        runtime: formatRuntime(endMs - startMs),
        icon: agentIcon,
        sessionKey: key,
      });
    }

    // Sort by start time descending
    activities.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    res.json({ ok: true, activities: activities.slice(0, 20) });
  } catch (err) {
    res.json({ ok: true, activities: [], error: err.message });
  }
});

// Pipeline status
app.get('/api/pipeline', (req, res) => {
  const pipelinePath = path.join(WORKSPACE, 'data/pipeline-status.json');
  try {
    const data = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
    res.json({ ok: true, ...data });
  } catch {
    res.json({ ok: true, active: false, stage: null, task: null, rounds: 0 });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Alice API server running on port ${PORT}`);
  console.log(`Auth token: ${TOKEN}`);
});
