const router = require('express').Router();
const fs = require('fs').promises;
const { getSystemStats } = require('../lib/system-stats');
const { CONFIG_PATH, SKILLS_DIR } = require('../lib/paths');
const path = require('path');
const fsSync = require('fs');

// Status endpoint (used for login validation)
router.get('/api/status', async (req, res) => {
  const stats = await getSystemStats();
  res.json({ ok: true, agent: 'Alice', status: 'online', timestamp: new Date().toISOString(), system: stats });
});

router.post('/api/status', async (req, res) => {
  const stats = await getSystemStats();
  res.json({ ok: true, agent: 'Alice', status: 'online', timestamp: new Date().toISOString(), system: stats });
});

// Gateway config — whitelist exposed fields
router.get('/api/config', async (req, res) => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const full = JSON.parse(raw);
    // Whitelist: only expose safe fields
    const config = {
      channels: full.channels ? Object.fromEntries(
        Object.entries(full.channels).map(([k, v]) => [k, { enabled: v.enabled !== false, type: k }])
      ) : {},
      model: full.model,
      defaultModel: full.defaultModel,
      thinkingLevel: full.thinkingLevel,
      heartbeat: full.heartbeat,
      skills: full.skills ? Object.keys(full.skills) : [],
    };
    res.json({ ok: true, config });
  } catch {
    res.status(500).json({ error: 'Could not read config' });
  }
});

// Skills list
router.get('/api/skills', async (req, res) => {
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const dirs = await Promise.all(
      entries.filter(d => d.isDirectory()).map(async (d) => {
        const skillPath = path.join(SKILLS_DIR, d.name, 'SKILL.md');
        let description = '';
        try {
          const content = await fs.readFile(skillPath, 'utf8');
          const descMatch = content.match(/description[:\s]*["']?([^\n"']+)/i);
          if (descMatch) description = descMatch[1].trim();
        } catch {}
        return { name: d.name, description, location: skillPath };
      })
    );
    res.json({ ok: true, skills: dirs });
  } catch {
    res.json({ ok: true, skills: [] });
  }
});

// Sessions list
router.get('/api/sessions', async (req, res) => {
  const { ocRpc } = require('../lib/oc-rpc');
  try {
    const result = await ocRpc('chat.history', {});
    res.json({ ok: true, sessions: result });
  } catch {
    res.json({ ok: true, sessions: [] });
  }
});

module.exports = router;
