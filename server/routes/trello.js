const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { TASKS_PATH, DATA_DIR } = require('../lib/paths');

const SEEN_PATH = path.join(DATA_DIR, 'trello-seen.json');
const PENDING_PATH = path.join(DATA_DIR, 'trello-pending.json');

async function readJSON(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; }
}
async function writeJSON(p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2));
}

router.get('/api/trello/pending', async (req, res) => {
  const pending = await readJSON(PENDING_PATH, []);
  res.json({ ok: true, pending });
});

router.post('/api/trello/approve/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const pending = await readJSON(PENDING_PATH, []);
  const idx = pending.findIndex(p => p.cardId === cardId);
  if (idx === -1) return res.status(404).json({ error: 'Card not in pending' });

  const card = pending[idx];

  // Create task in tasks.json
  const tasksData = await readJSON(TASKS_PATH, { tasks: [], nextId: 1 });
  const now = new Date().toISOString();
  const task = {
    id: tasksData.nextId++,
    title: card.name,
    description: `Trello: ${card.url}`,
    status: 'inbox',
    assignedTo: '',
    model: '',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    sessionId: null,
    result: null,
    rounds: 0,
    source: 'trello',
    priority: 'medium',
    project: 'pos-desktop',
    parentTaskId: null,
    pipelineRound: 0,
  };
  tasksData.tasks.push(task);
  await writeJSON(TASKS_PATH, tasksData);

  // Remove from pending, add to seen
  pending.splice(idx, 1);
  await writeJSON(PENDING_PATH, pending);
  const seen = await readJSON(SEEN_PATH, []);
  if (!seen.includes(cardId)) seen.push(cardId);
  await writeJSON(SEEN_PATH, seen);

  res.json({ ok: true, taskId: task.id });
});

router.post('/api/trello/skip/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const pending = await readJSON(PENDING_PATH, []);
  const idx = pending.findIndex(p => p.cardId === cardId);
  if (idx === -1) return res.status(404).json({ error: 'Card not in pending' });

  pending.splice(idx, 1);
  await writeJSON(PENDING_PATH, pending);
  const seen = await readJSON(SEEN_PATH, []);
  if (!seen.includes(cardId)) seen.push(cardId);
  await writeJSON(SEEN_PATH, seen);

  res.json({ ok: true });
});

router.get('/api/trello/status', async (req, res) => {
  const poller = require('../trello-poller');
  const status = await poller.getStatus();
  res.json({ ok: true, ...status });
});

module.exports = router;
