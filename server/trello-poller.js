const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR } = require('./lib/paths');

const SEEN_PATH = path.join(DATA_DIR, 'trello-seen.json');
const PENDING_PATH = path.join(DATA_DIR, 'trello-pending.json');
const CARD_LISTS_PATH = path.join(DATA_DIR, 'trello-card-lists.json');

const LIST_MAP = {
  '687887806558819fefa195c7': '🕹️Product Backlog',
  '687887806558819fefa195c5': '📌To Do',
  '687889856b72ff707a73b13f': '🕜In Progress',
  '68ee3e138d775bdedc476c90': 'Ready for POS',
  '697996a63da47615e003e46b': 'Ready for Deploy',
  '68788eef2f149de113055911': 'Ready for QA Test ⏳',
  '687887806558819fefa195c8': '✅Done',
  '687f29d7ddfc8f8838db09e5': 'Abror',
};

const WATCH_LISTS = ['687887806558819fefa195c5', '687889856b72ff707a73b13f']; // To Do, In Progress

let lastPoll = null;
let pollInterval = null;

async function readJSON(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; }
}
async function writeJSON(p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2));
}

async function fetchCards() {
  const { TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID } = process.env;
  const url = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,idList,idMembers,url,labels,due,dateLastActivity&members=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Trello API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function poll() {
  try {
    const memberId = process.env.TRELLO_MEMBER_ID;
    const allCards = await fetchCards();
    const myCards = allCards.filter(c => c.idMembers && c.idMembers.includes(memberId));

    const seen = await readJSON(SEEN_PATH, null);
    const pending = await readJSON(PENDING_PATH, []);
    const cardLists = await readJSON(CARD_LISTS_PATH, {});

    // First run: seed seen with all current card IDs
    if (seen === null) {
      const seenIds = myCards.map(c => c.id);
      // Also seed card list positions
      const lists = {};
      for (const c of myCards) lists[c.id] = c.idList;
      await writeJSON(SEEN_PATH, seenIds);
      await writeJSON(CARD_LISTS_PATH, lists);
      await writeJSON(PENDING_PATH, pending);
      lastPoll = new Date().toISOString();
      console.log(`[trello-poller] First run: seeded ${seenIds.length} cards as seen`);
      return;
    }

    const seenSet = new Set(seen);
    const pendingIds = new Set(pending.map(p => p.cardId));
    const now = new Date().toISOString();

    for (const card of myCards) {
      const listName = LIST_MAP[card.idList] || card.idList;

      // New card not seen before
      if (!seenSet.has(card.id) && !pendingIds.has(card.id)) {
        pending.push({
          cardId: card.id, name: card.name, list: listName,
          url: card.url, labels: card.labels || [], due: card.due,
          detectedAt: now, reason: 'new_assignment',
        });
        pendingIds.add(card.id);
      }

      // Existing card moved to watched list
      if (seenSet.has(card.id) && !pendingIds.has(card.id)) {
        const prevList = cardLists[card.id];
        if (prevList && prevList !== card.idList && WATCH_LISTS.includes(card.idList)) {
          pending.push({
            cardId: card.id, name: card.name, list: listName,
            url: card.url, labels: card.labels || [], due: card.due,
            detectedAt: now, reason: 'moved_to_' + (card.idList === WATCH_LISTS[0] ? 'todo' : 'in_progress'),
          });
          pendingIds.add(card.id);
        }
      }

      // Update tracked list position
      cardLists[card.id] = card.idList;
    }

    await writeJSON(PENDING_PATH, pending);
    await writeJSON(CARD_LISTS_PATH, cardLists);
    lastPoll = now;
    console.log(`[trello-poller] Polled: ${myCards.length} cards, ${pending.length} pending`);
  } catch (err) {
    console.error('[trello-poller] Error:', err.message);
  }
}

function start() {
  const { TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID, TRELLO_MEMBER_ID } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_BOARD_ID || !TRELLO_MEMBER_ID) {
    console.warn('[trello-poller] Missing TRELLO env vars, poller disabled');
    return;
  }
  console.log('[trello-poller] Starting (5 min interval)');
  poll();
  pollInterval = setInterval(poll, 5 * 60 * 1000);
}

module.exports = {
  start,
  getStatus: async () => {
    const seen = await readJSON(SEEN_PATH, []);
    const pending = await readJSON(PENDING_PATH, []);
    return {
      enabled: !!pollInterval,
      lastPoll,
      seenCount: Array.isArray(seen) ? seen.length : 0,
      pendingCount: pending.length,
    };
  },
  SEEN_PATH, PENDING_PATH,
  readJSON, writeJSON,
};
