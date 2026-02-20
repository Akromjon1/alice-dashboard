const router = require('express').Router();
const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR } = require('../lib/paths');

function getTashkentDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tashkent = new Date(utc + 5 * 3600000);
  return tashkent.toISOString().slice(0, 10);
}

function planPath(date) {
  return path.join(DATA_DIR, `plan-${date}.md`);
}

function parsePlan(content, date) {
  const lines = content.split('\n');
  const sections = [];
  let title = '';
  let currentSection = null;
  let itemIndex = 0;

  for (const line of lines) {
    const titleMatch = line.match(/^#\s+(.+)/);
    if (titleMatch && !title) {
      title = titleMatch[1].trim();
      continue;
    }
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) {
      currentSection = { name: sectionMatch[1].trim(), items: [] };
      sections.push(currentSection);
      continue;
    }
    const itemMatch = line.match(/^- \[([ x])\]\s+(.+)/);
    if (itemMatch && currentSection) {
      currentSection.items.push({
        id: itemIndex++,
        text: itemMatch[2].trim(),
        checked: itemMatch[1] === 'x',
        section: currentSection.name,
      });
    }
  }

  return { date, title, sections };
}

function planToMarkdown(plan) {
  let md = `# ${plan.title}\n\n`;
  for (const section of plan.sections) {
    md += `## ${section.name}\n`;
    for (const item of section.items) {
      md += `- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
    }
    md += '\n';
  }
  return md.trimEnd() + '\n';
}

router.get('/api/plan', async (req, res) => {
  const date = req.query.date || getTashkentDate();
  try {
    const content = await fs.readFile(planPath(date), 'utf8');
    res.json({ ok: true, plan: parsePlan(content, date) });
  } catch {
    res.json({ ok: true, plan: { date, title: '', sections: [] } });
  }
});

router.post('/api/plan', async (req, res) => {
  const { date, content } = req.body;
  if (!date || !content) return res.status(400).json({ error: 'date and content required' });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(planPath(date), content, 'utf8');
  const plan = parsePlan(content, date);
  res.json({ ok: true, plan });
});

router.get('/api/plan/dates', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const dates = files
      .filter(f => f.match(/^plan-\d{4}-\d{2}-\d{2}\.md$/))
      .map(f => f.replace('plan-', '').replace('.md', ''))
      .sort()
      .reverse();
    res.json({ ok: true, dates });
  } catch {
    res.json({ ok: true, dates: [] });
  }
});

module.exports = router;
