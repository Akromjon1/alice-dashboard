const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { WORKSPACE, MEMORY_DIR } = require('../lib/paths');
const { validate } = require('../lib/validate');

// Safe path resolution — must stay within allowed directory
function safePath(base, userPath) {
  const resolved = path.resolve(base, userPath);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

router.get('/api/notes', async (req, res) => {
  try {
    const files = (await fs.readdir(MEMORY_DIR))
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 30);

    const notes = await Promise.all(files.map(async f => ({
      name: f,
      date: f.replace('.md', ''),
      content: await fs.readFile(path.join(MEMORY_DIR, f), 'utf8'),
    })));
    res.json({ ok: true, notes });
  } catch {
    res.json({ ok: true, notes: [] });
  }
});

router.get('/api/file', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(WORKSPACE)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  try {
    const content = await fs.readFile(resolved, 'utf8');
    res.json({ ok: true, content });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

router.post('/api/notes', async (req, res) => {
  const err = validate(req.body, ['filename', 'content']);
  if (err) return res.status(400).json({ error: err });
  const { filename, content } = req.body;
  await fs.mkdir(MEMORY_DIR, { recursive: true });
  const filePath = safePath(MEMORY_DIR, filename);
  if (!filePath) return res.status(400).json({ error: 'Invalid path' });
  await fs.writeFile(filePath, content);
  res.json({ ok: true });
});

module.exports = router;
