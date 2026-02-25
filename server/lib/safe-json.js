/**
 * safe-json.js — Atomic JSON read/write with file-level mutex.
 *
 * Prevents race conditions when scheduler.js tick() and API routes
 * both read/write the same JSON file concurrently.
 *
 * Usage:
 *   const { withJsonFile } = require('./lib/safe-json');
 *
 *   // Read-only:
 *   const data = await withJsonFile(TASKS_PATH, (data) => data);
 *
 *   // Read-modify-write (atomic):
 *   const result = await withJsonFile(TASKS_PATH, (data) => {
 *     data.tasks.push(newTask);
 *     return data;  // returning the data signals a write
 *   }, { write: true });
 */

const fs = require('fs').promises;
const path = require('path');

// In-memory mutex per file path
const locks = new Map();

function getLock(filePath) {
  if (!locks.has(filePath)) {
    locks.set(filePath, { queue: [], locked: false });
  }
  return locks.get(filePath);
}

function acquire(filePath) {
  return new Promise((resolve) => {
    const lock = getLock(filePath);
    if (!lock.locked) {
      lock.locked = true;
      resolve();
    } else {
      lock.queue.push(resolve);
    }
  });
}

function release(filePath) {
  const lock = getLock(filePath);
  if (lock.queue.length > 0) {
    const next = lock.queue.shift();
    next();
  } else {
    lock.locked = false;
  }
}

/**
 * Safely read (and optionally write) a JSON file with mutex protection.
 *
 * @param {string} filePath - Absolute path to the JSON file
 * @param {function} fn - Callback receiving parsed data, returns modified data
 * @param {object} opts - { write: boolean, defaultValue: any }
 * @returns {any} - Whatever fn returns
 */
async function withJsonFile(filePath, fn, opts = {}) {
  const { write = false, defaultValue = null } = opts;

  await acquire(filePath);
  try {
    let data;
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(raw);
    } catch {
      data = defaultValue;
    }

    const result = fn(data);

    if (write) {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      // Atomic write: write to temp file then rename
      const tmpPath = filePath + '.tmp';
      await fs.writeFile(tmpPath, JSON.stringify(result, null, 2));
      await fs.rename(tmpPath, filePath);
    }

    return result;
  } finally {
    release(filePath);
  }
}

module.exports = { withJsonFile };
