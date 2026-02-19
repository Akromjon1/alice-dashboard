const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { MODEL_ROLES_PATH, DATA_DIR } = require('../lib/paths');

router.get('/api/model-roles', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(MODEL_ROLES_PATH, 'utf8'));
    res.json({ ok: true, roles: data.roles || [] });
  } catch {
    res.json({ ok: true, roles: [] });
  }
});

router.post('/api/model-roles', async (req, res) => {
  const { roles } = req.body;
  if (!Array.isArray(roles)) return res.status(400).json({ error: 'Missing roles array' });
  await fs.mkdir(DATA_DIR, { recursive: true });
  const data = { roles, updatedAt: new Date().toISOString() };
  await fs.writeFile(MODEL_ROLES_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

module.exports = router;
