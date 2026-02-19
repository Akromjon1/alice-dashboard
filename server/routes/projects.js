const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR } = require('../lib/paths');
const { validate } = require('../lib/validate');

const PROJECTS_PATH = path.join(DATA_DIR, 'projects.json');

async function readProjects() {
  try {
    const raw = await fs.readFile(PROJECTS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { projects: [] };
  }
}

async function writeProjects(data) {
  await fs.mkdir(path.dirname(PROJECTS_PATH), { recursive: true });
  await fs.writeFile(PROJECTS_PATH, JSON.stringify(data, null, 2));
}

router.get('/api/projects', async (req, res) => {
  const data = await readProjects();
  res.json({ ok: true, projects: data.projects });
});

router.post('/api/projects', async (req, res) => {
  const err = validate(req.body, ['id', 'name']);
  if (err) return res.status(400).json({ error: err });

  const { id, name, icon, color, techStack, repoPath } = req.body;
  const data = await readProjects();

  if (data.projects.find(p => p.id === id)) {
    return res.status(400).json({ error: 'Project with this id already exists' });
  }

  const project = { id, name, icon: icon || '📁', color: color || '#6B7280', techStack: techStack || '', repoPath: repoPath || '' };
  data.projects.push(project);
  await writeProjects(data);
  res.json({ ok: true, project });
});

router.delete('/api/projects/:id', async (req, res) => {
  const data = await readProjects();
  data.projects = data.projects.filter(p => p.id !== req.params.id);
  await writeProjects(data);
  res.json({ ok: true });
});

module.exports = router;
