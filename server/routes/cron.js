const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { OPENCLAW_DIR } = require('../lib/paths');

async function findCronFiles(dir, depth = 0) {
  if (depth > 3) return [];
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && e.name.includes('cron') && e.name.endsWith('.json')) results.push(full);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        results.push(...await findCronFiles(full, depth + 1));
      }
    }
  } catch {}
  return results;
}

router.get('/api/cron', async (req, res) => {
  let jobs = [];
  try {
    const searchPaths = [
      path.join(OPENCLAW_DIR, 'cron/jobs.json'),
      path.join(OPENCLAW_DIR, 'cron-jobs.json'),
      path.join(OPENCLAW_DIR, 'state/cron-jobs.json'),
    ];
    const found = await findCronFiles(OPENCLAW_DIR);
    const allPaths = [...new Set([...searchPaths, ...found])];
    const scanned = [];

    for (const p of allPaths) {
      try {
        const raw = await fs.readFile(p, 'utf8');
        scanned.push(p);
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) { jobs = data; break; }
        if (data.jobs && data.jobs.length > 0) { jobs = data.jobs; break; }
      } catch {}
    }

    res.json({ ok: true, jobs, scanned });
  } catch (err) {
    res.json({ ok: true, jobs: [], error: err.message });
  }
});

module.exports = router;
