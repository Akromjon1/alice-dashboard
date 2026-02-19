const router = require('express').Router();
const fs = require('fs').promises;
const { TUBE_PATH } = require('../lib/paths');
const { validate } = require('../lib/validate');

router.get('/api/youtube', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(TUBE_PATH, 'utf8'));
    res.json({ ok: true, ...data });
  } catch {
    res.json({ ok: true, channels: [], videos: [] });
  }
});

router.post('/api/youtube/channel', async (req, res) => {
  const err = validate(req.body, ['name', 'url']);
  if (err) return res.status(400).json({ error: err });
  const { name, url } = req.body;
  let data = { channels: [], videos: [] };
  try { data = JSON.parse(await fs.readFile(TUBE_PATH, 'utf8')); } catch {}
  data.channels.push({ name, url, addedAt: new Date().toISOString().split('T')[0] });
  await fs.writeFile(TUBE_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

router.delete('/api/youtube/channel', async (req, res) => {
  const { url } = req.body;
  try {
    const data = JSON.parse(await fs.readFile(TUBE_PATH, 'utf8'));
    data.channels = data.channels.filter(c => c.url !== url);
    await fs.writeFile(TUBE_PATH, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/api/youtube/video', async (req, res) => {
  const err = validate(req.body, ['title', 'url']);
  if (err) return res.status(400).json({ error: err });
  const { title, url } = req.body;
  let data = { channels: [], videos: [] };
  try { data = JSON.parse(await fs.readFile(TUBE_PATH, 'utf8')); } catch {}
  if (!data.videos) data.videos = [];
  data.videos.push({ title, url, addedAt: new Date().toISOString().split('T')[0] });
  await fs.writeFile(TUBE_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

module.exports = router;
