const router = require('express').Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { WORKSPACE, SESSIONS_DIR, MODEL_ROLES_PATH, PIPELINE_PATH } = require('../lib/paths');

function getModelTier(model) {
  if (!model) return 'unknown';
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  return 'other';
}

function formatRuntime(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

router.get('/api/activity', async (req, res) => {
  const activities = [];

  let roles = [];
  try { roles = JSON.parse(await fs.readFile(MODEL_ROLES_PATH, 'utf8')).roles || []; } catch {}

  function agentFromModel(tier) {
    const role = roles.find(r => getModelTier(r.model) === tier);
    return role ? { name: role.name, icon: role.icon } : { name: 'Agent', icon: '🤖' };
  }

  try {
    const sessionsData = JSON.parse(await fs.readFile(path.join(SESSIONS_DIR, 'sessions.json'), 'utf8'));

    for (const [key, meta] of Object.entries(sessionsData)) {
      if (key === 'agent:main:main') continue;

      const sessionId = meta.sessionId;
      const jsonlPath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);

      let stat;
      try { stat = await fs.stat(jsonlPath); } catch { continue; }

      let lockExists = false;
      try { await fs.access(jsonlPath + '.lock'); lockExists = true; } catch {}

      let task = meta.label || '';
      let model = meta.model || '';
      let startedAt = null;
      let completedAt = null;
      let status = 'completed';

      try {
        const content = await fs.readFile(jsonlPath, 'utf8');
        const lines = content.split('\n').filter(Boolean);

        if (lines.length > 0) {
          try { startedAt = JSON.parse(lines[0]).timestamp; } catch {}
        }

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

        if (!model) {
          for (const line of lines.slice(0, 5)) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'model_change') { model = obj.modelId || ''; break; }
            } catch {}
          }
        }

        if (lockExists) {
          status = 'running';
        } else {
          completedAt = stat.mtime.toISOString();
          for (const line of lines.slice(-5)) {
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
        id: sessionId, agent: agentName, task: task.slice(0, 120) || 'No description',
        status, model: tier, startedAt: startedAt || stat.birthtime.toISOString(),
        completedAt: status === 'running' ? null : completedAt,
        runtime: formatRuntime(endMs - startMs), icon: agentIcon, sessionKey: key,
      });
    }

    activities.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    res.json({ ok: true, activities: activities.slice(0, 20) });
  } catch (err) {
    res.json({ ok: true, activities: [], error: err.message });
  }
});

router.get('/api/pipeline', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(PIPELINE_PATH, 'utf8'));
    res.json({ ok: true, ...data });
  } catch {
    res.json({ ok: true, active: false, stage: null, task: null, rounds: 0 });
  }
});

module.exports = router;
