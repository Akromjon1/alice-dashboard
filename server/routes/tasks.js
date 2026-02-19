const router = require('express').Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { TASKS_PATH, MODEL_ROLES_PATH } = require('../lib/paths');
const { validate } = require('../lib/validate');

async function readTasks() {
  try {
    const raw = await fs.readFile(TASKS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { tasks: [], nextId: 1 };
  }
}

async function writeTasks(data) {
  const dir = path.dirname(TASKS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(TASKS_PATH, JSON.stringify(data, null, 2));
}

router.get('/api/tasks', async (req, res) => {
  const data = await readTasks();
  const sorted = data.tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ ok: true, tasks: sorted });
});

router.post('/api/tasks', async (req, res) => {
  const err = validate(req.body, ['title']);
  if (err) return res.status(400).json({ error: err });

  const { title, description, assignedTo, priority, source } = req.body;
  const data = await readTasks();

  let model = '';
  try {
    const roles = JSON.parse(await fs.readFile(MODEL_ROLES_PATH, 'utf8')).roles || [];
    const role = roles.find(r => r.id === assignedTo);
    if (role) model = role.model;
  } catch {}

  const now = new Date().toISOString();
  const task = {
    id: data.nextId++, title, description: description || '', status: 'inbox',
    assignedTo: assignedTo || '', model, createdAt: now, updatedAt: now,
    completedAt: null, sessionId: null, result: null, rounds: 0,
    source: source || 'dashboard', priority: priority || 'medium',
  };
  data.tasks.push(task);
  await writeTasks(data);
  res.json({ ok: true, task });
});

const ALLOWED_FIELDS = ['status', 'assignedTo', 'result', 'sessionId', 'rounds', 'priority', 'title', 'description', 'model'];

async function updateTask(req, res) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const data = await readTasks();
  const task = data.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) task[key] = req.body[key];
  }
  task.updatedAt = new Date().toISOString();
  if (task.status === 'done' || task.status === 'failed') {
    task.completedAt = task.completedAt || new Date().toISOString();
  }
  await writeTasks(data);
  res.json({ ok: true, task });
}

router.patch('/api/tasks/:id', updateTask);
router.post('/api/tasks/:id', updateTask);

router.delete('/api/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await readTasks();
  data.tasks = data.tasks.filter(t => t.id !== id);
  await writeTasks(data);
  res.json({ ok: true });
});

router.post('/api/tasks/:id/start', async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await readTasks();
  const task = data.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  task.status = 'in_progress';
  task.updatedAt = new Date().toISOString();
  await writeTasks(data);
  res.json({ ok: true, task });
});

router.post('/api/tasks/:id/complete', async (req, res) => {
  const id = parseInt(req.params.id);
  const data = await readTasks();
  const task = data.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  task.status = 'done';
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  task.result = req.body.result || null;
  await writeTasks(data);
  res.json({ ok: true, task });
});

module.exports = router;
