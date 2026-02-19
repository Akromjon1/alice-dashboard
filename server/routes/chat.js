const router = require('express').Router();
const { ocRpc } = require('../lib/oc-rpc');
const { validate } = require('../lib/validate');

router.post('/api/chat', async (req, res) => {
  const err = validate(req.body, ['message']);
  if (err) return res.status(400).json({ error: err });
  try {
    const result = await ocRpc('chat.send', { text: req.body.message });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
