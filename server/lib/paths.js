const path = require('path');

const WORKSPACE = '/Users/akrom/.openclaw/workspace';
const DATA_DIR = path.join(WORKSPACE, 'data');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const OPENCLAW_DIR = '/Users/akrom/.openclaw';
const SESSIONS_DIR = path.join(OPENCLAW_DIR, 'agents/main/sessions');
const SKILLS_DIR = '/opt/homebrew/lib/node_modules/openclaw/skills';
const CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');
const TASKS_PATH = path.join(DATA_DIR, 'tasks.json');
const MODEL_ROLES_PATH = path.join(DATA_DIR, 'model-roles.json');
const MATCHES_PATH = path.join(DATA_DIR, 'matches.json');
const TUBE_PATH = path.join(DATA_DIR, 'tube.json');
const PIPELINE_PATH = path.join(DATA_DIR, 'pipeline-status.json');

module.exports = {
  WORKSPACE, DATA_DIR, MEMORY_DIR, OPENCLAW_DIR, SESSIONS_DIR, SKILLS_DIR,
  CONFIG_PATH, TASKS_PATH, MODEL_ROLES_PATH, MATCHES_PATH, TUBE_PATH, PIPELINE_PATH,
};
