const { TASKS_PATH, MODEL_ROLES_PATH } = require('./lib/paths');
const { readJSON, writeJSON } = require('./lib/safe-json');

const state = {
  running: false,
  lastCheck: null,
  intervalId: null,
};

// Auto-assign agent based on task title/description keywords
function autoAssign(task, roles) {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();

  // Coding keywords
  const codeWords = ['code', 'fix', 'bug', 'refactor', 'build', 'add feature', 'implement', 'create page', 'update ui', 'css', 'html', 'component', 'endpoint', 'api', 'deploy', 'design', 'redesign', 'layout', 'style', 'button', 'modal', 'page', 'dark mode', 'light mode', 'theme'];
  // QA/test keywords
  const testWords = ['test', 'review', 'qa', 'check', 'audit', 'verify', 'validate', 'inspect'];
  // Research keywords
  const researchWords = ['research', 'search', 'find', 'look up', 'analyze', 'compare', 'data', 'fetch', 'scrape'];
  // Match keywords
  const matchWords = ['match', 'score', 'fixture', 'tournament', 'league', 'football', 'cs2', 'dota', 'ufc', 'sports'];
  // YouTube keywords
  const youtubeWords = ['youtube', 'video', 'channel', 'subscribe', 'tube'];

  const has = (words) => words.some(w => text.includes(w));

  let roleId = 'coding'; // default to coding
  if (has(testWords)) roleId = 'tester';
  else if (has(researchWords)) roleId = 'research';
  else if (has(matchWords)) roleId = 'matches';
  else if (has(youtubeWords)) roleId = 'youtube';
  else if (has(codeWords)) roleId = 'coding';

  const role = roles.find(r => r.id === roleId);
  return role || roles.find(r => r.id === 'coding') || (roles.length > 0 ? roles[0] : null);
}

async function tick() {
  try {
    const data = await readJSON(TASKS_PATH);
    if (!data || !data.tasks) return;

    const rolesData = await readJSON(MODEL_ROLES_PATH);
    const roles = (rolesData && rolesData.roles) || [];

    const now = new Date().toISOString();
    state.lastCheck = now;

    // Find busy agents (in_progress tasks that have a sessionId)
    const busyAgents = new Set();
    for (const t of data.tasks) {
      if (t.status === 'in_progress' && t.sessionId) {
        busyAgents.add(t.assignedTo);
      }
    }

    let changed = false;

    // Auto-assign tasks that have no agent
    for (const task of data.tasks) {
      if ((task.status === 'inbox' || task.status === 'assigned') && !task.assignedTo) {
        const agent = autoAssign(task, roles);
        if (agent) {
          task.assignedTo = agent.id;
          task.model = agent.model;
          task.updatedAt = now;
          changed = true;
          console.log(`[scheduler] Auto-assigned task #${task.id} "${task.title}" → ${agent.id}`);
        }
      }
    }

    // Pick up inbox/assigned tasks if their agent isn't busy
    for (const task of data.tasks) {
      if (task.status !== 'inbox' && task.status !== 'assigned') continue;
      if (!task.assignedTo) continue;
      if (busyAgents.has(task.assignedTo)) continue;

      // Move to in_progress (no sessionId yet — waiting for Alice to spawn)
      task.status = 'in_progress';
      task.updatedAt = now;
      busyAgents.add(task.assignedTo);
      changed = true;
      console.log(`[scheduler] Queued task #${task.id} "${task.title}" for ${task.assignedTo}`);
    }

    if (changed) {
      await writeJSON(TASKS_PATH, data);
    }
  } catch (err) {
    console.error('[scheduler] tick error:', err.message);
  }
}

/**
 * Pipeline: handle task completion with auto QA creation.
 */
async function handleCompletion(taskId, result, status) {
  const data = await readJSON(TASKS_PATH);
  if (!data || !data.tasks) return null;

  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return null;

  const now = new Date().toISOString();
  task.status = status === 'done' ? 'done' : 'failed';
  task.completedAt = now;
  task.updatedAt = now;
  task.result = result || null;

  // Pipeline: coding task completed → create QA task
  if (status === 'done' && task.assignedTo === 'coding' && task.source !== 'pipeline-qa') {
    const round = task.pipelineRound || 1;
    const rolesData = await readJSON(MODEL_ROLES_PATH);
    const roles = (rolesData && rolesData.roles) || [];
    const testerRole = roles.find(r => r.id === 'tester');

    const qaTask = {
      id: data.nextId++,
      title: `QA Review: ${task.title}`,
      description: `Review the output of task #${task.id}: ${task.title}\n\nCoder result: ${result || 'completed'}`,
      status: 'inbox',
      assignedTo: 'tester',
      model: testerRole ? testerRole.model : 'sonnet',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      sessionId: null,
      result: null,
      rounds: 0,
      source: 'pipeline',
      priority: task.priority,
      parentTaskId: task.id,
      pipelineRound: round,
    };
    data.tasks.push(qaTask);
    console.log(`[scheduler] Created QA task #${qaTask.id} for coding task #${task.id} (round ${round})`);
  }

  // Pipeline: QA task completed
  if (task.source === 'pipeline' && task.assignedTo === 'tester' && task.parentTaskId) {
    const parentTask = data.tasks.find(t => t.id === task.parentTaskId);
    if (parentTask) {
      if (status === 'done' && result && result.toUpperCase().includes('PASS')) {
        // QA passed
        parentTask.status = 'done';
        parentTask.completedAt = now;
        parentTask.updatedAt = now;
        console.log(`[scheduler] QA passed for task #${parentTask.id}`);
      } else if (status === 'done' && result && result.toUpperCase().includes('FAIL')) {
        const round = (task.pipelineRound || 1);
        if (round < 3) {
          // Create fix task
          const rolesData = await readJSON(MODEL_ROLES_PATH);
          const roles = (rolesData && rolesData.roles) || [];
          const codingRole = roles.find(r => r.id === 'coding');

          const fixTask = {
            id: data.nextId++,
            title: `Fix: ${parentTask.title}`,
            description: `QA failed (round ${round}). Issues:\n${result}\n\nFix these issues in the original task.`,
            status: 'inbox',
            assignedTo: 'coding',
            model: codingRole ? codingRole.model : 'opus',
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            sessionId: null,
            result: null,
            rounds: 0,
            source: 'pipeline-qa',
            priority: parentTask.priority,
            parentTaskId: parentTask.id,
            pipelineRound: round + 1,
          };
          data.tasks.push(fixTask);
          console.log(`[scheduler] QA failed, created fix task #${fixTask.id} (round ${round + 1})`);
        } else {
          parentTask.status = 'failed';
          parentTask.updatedAt = now;
          parentTask.result = `Failed after ${round} QA rounds: ${result}`;
          console.log(`[scheduler] Task #${parentTask.id} failed after ${round} rounds`);
        }
      }
    }
  }

  await writeJSON(TASKS_PATH, data);
  return task;
}

function getStatus(tasks) {
  const allTasks = tasks || [];
  const busyAgents = [];
  const queuedSpawns = [];

  for (const t of allTasks) {
    if (t.status === 'in_progress' && t.sessionId) {
      if (!busyAgents.includes(t.assignedTo)) busyAgents.push(t.assignedTo);
    }
    if (t.status === 'in_progress' && !t.sessionId) {
      queuedSpawns.push({
        taskId: t.id,
        agent: t.assignedTo,
        model: t.model,
        task: t.title,
      });
    }
  }

  const pending = allTasks.filter(t => t.status === 'inbox' || t.status === 'assigned').length;

  return {
    running: state.running,
    lastCheck: state.lastCheck,
    busyAgents,
    pendingTasks: pending,
    queuedSpawns,
  };
}

function start() {
  if (state.running) return;
  state.running = true;
  state.intervalId = setInterval(tick, 10000);
  // Run immediately on start
  tick();
  console.log('[scheduler] Started (10s interval)');
}

function stop() {
  if (!state.running) return;
  state.running = false;
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  console.log('[scheduler] Stopped');
}

module.exports = { start, stop, getStatus, handleCompletion, state };
