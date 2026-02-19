const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { MATCHES_PATH, DATA_DIR } = require('../lib/paths');
const { validate } = require('../lib/validate');

router.get('/api/matches', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(MATCHES_PATH, 'utf8'));
    res.json({ ok: true, ...data });
  } catch {
    res.json({ ok: true, matches: [], teams: [] });
  }
});

router.get('/api/ufc', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(MATCHES_PATH, 'utf8'));
    res.json({ ok: true, events: data.ufc || [] });
  } catch {
    res.json({ ok: true, events: [] });
  }
});

router.post('/api/matches/team', async (req, res) => {
  const err = validate(req.body, ['name']);
  if (err) return res.status(400).json({ error: err });
  const { name, league } = req.body;
  let data = { teams: [], matches: [] };
  try { data = JSON.parse(await fs.readFile(MATCHES_PATH, 'utf8')); } catch {}
  if (!data.teams) data.teams = [];
  data.teams.push({ name, league: league || '', addedAt: new Date().toISOString().split('T')[0] });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MATCHES_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

router.delete('/api/matches/team', async (req, res) => {
  const { name } = req.body;
  try {
    const data = JSON.parse(await fs.readFile(MATCHES_PATH, 'utf8'));
    data.teams = (data.teams || []).filter(t => t.name !== name);
    await fs.writeFile(MATCHES_PATH, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
