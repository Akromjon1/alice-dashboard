const router = require('express').Router();
const { TASKS_PATH } = require('../lib/paths');
const { readJSON, writeJSON } = require('../lib/safe-json');
const scheduler = require('../scheduler');

// GET /api/scheduler/status
router.get('/api/scheduler/status', async (_req, res) => {
  const data = await readJSON(TASKS_PATH, { tasks: [], nextId: 1 });
  const status = scheduler.getStatus(data.tasks || []);
  res.json({ ok: true, ...status });
});

// GET /api/scheduler/queue — tasks needing agent spawning
router.get('/api/scheduler/queue', async (_req, res) => {
  const data = await readJSON(TASKS_PATH, { tasks: [], nextId: 1 });
  const queue = (data.tasks || [])
    .filter(t => t.status === 'in_progress' && !t.sessionId)
    .map(t => ({
      taskId: t.id,
      agent: t.assignedTo,
      model: t.model,
      title: t.title,
      description: t.description,
      priority: t.priority,
      parentTaskId: t.parentTaskId || null,
      pipelineRound: t.pipelineRound || null,
    }));
  res.json({ ok: true, queue });
});

// POST /api/scheduler/ack/:taskId — mark task as spawned
router.post('/api/scheduler/ack/:taskId', async (req, res) => {
  const id = parseInt(req.params.taskId);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const data = await readJSON(TASKS_PATH, { tasks: [], nextId: 1 });
  const task = (data.tasks || []).find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  task.sessionId = req.body.sessionId || `session-${Date.now()}`;
  task.updatedAt = new Date().toISOString();
  await writeJSON(TASKS_PATH, data);
  res.json({ ok: true, task });
});

// POST /api/scheduler/complete/:taskId — agent finished
router.post('/api/scheduler/complete/:taskId', async (req, res) => {
  const id = parseInt(req.params.taskId);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const { result, status } = req.body;
  if (!status || !['done', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'status must be "done" or "failed"' });
  }

  const task = await scheduler.handleCompletion(id, result || '', status);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  res.json({ ok: true, task });
});

module.exports = router;
