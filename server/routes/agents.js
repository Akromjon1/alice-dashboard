const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { WORKSPACE, MEMORY_DIR, MODEL_ROLES_PATH, TUBE_PATH, MATCHES_PATH } = require('../lib/paths');

function getModelTier(model) {
  if (!model) return null;
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  return 'local';
}

router.get('/api/agents', async (req, res) => {
  const agents = [];

  let roles = [];
  try {
    roles = JSON.parse(await fs.readFile(MODEL_ROLES_PATH, 'utf8')).roles || [];
  } catch {}

  const roleTypeMap = {
    'coding': 'pipeline', 'alice-main': 'main', 'tester': 'pipeline',
    'research': 'utility', 'matches': 'watcher', 'youtube': 'watcher', 'cron': 'system',
  };
  const pipelineIds = new Set(['coding', 'tester']);
  const today = new Date().toISOString().split('T')[0];

  let lastActiveDate = 'unknown';
  try {
    const files = (await fs.readdir(MEMORY_DIR)).filter(f => f.endsWith('.md'));
    const todayFile = files.find(f => f.includes(today));
    lastActiveDate = todayFile ? today : files[files.length - 1]?.replace('.md', '') || 'unknown';
  } catch {}

  for (const role of roles) {
    const tier = getModelTier(role.model);
    const agentType = roleTypeMap[role.id] || 'utility';
    let status = 'running';
    let description = role.description;
    let lastActive = lastActiveDate;

    if (pipelineIds.has(role.id)) { status = 'ready'; lastActive = 'on-demand'; }

    if (role.id === 'youtube') {
      try {
        const tube = JSON.parse(await fs.readFile(TUBE_PATH, 'utf8'));
        status = tube.channels?.length > 0 ? 'running' : 'stopped';
        description = `Tracking ${tube.channels?.length || 0} channels, ${tube.videos?.length || 0} videos`;
        lastActive = tube.channels?.[tube.channels.length - 1]?.addedAt || 'unknown';
      } catch { status = 'stopped'; }
    }

    if (role.id === 'matches') {
      try {
        const matches = JSON.parse(await fs.readFile(MATCHES_PATH, 'utf8'));
        status = matches.teams?.length > 0 ? 'running' : 'stopped';
        description = `Tracking ${matches.teams?.length || 0} teams`;
        lastActive = matches.teams?.[matches.teams.length - 1]?.addedAt || 'unknown';
      } catch { status = 'stopped'; description = 'No teams tracked yet'; }
    }

    if (role.id === 'cron') {
      try {
        const hb = await fs.readFile(path.join(WORKSPACE, 'HEARTBEAT.md'), 'utf8');
        const hasContent = hb.replace(/[#\s\n]/g, '').replace(/keepthisfileempty.*/i, '').trim().length > 0;
        status = hasContent ? 'running' : 'standby';
        lastActive = 'continuous';
      } catch { status = 'standby'; }
    }

    if (role.id === 'research') { status = 'standby'; lastActive = 'on-demand'; }

    agents.push({
      id: role.id, name: role.name, icon: role.icon, type: agentType, status,
      description, lastActive, model: role.model, modelTier: tier,
      isPipeline: pipelineIds.has(role.id) || role.id === 'alice-main',
    });
  }

  res.json({ ok: true, agents });
});

module.exports = router;
