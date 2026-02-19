function validate(body, required) {
  const missing = required.filter(f => !body[f]);
  if (missing.length) return `Missing: ${missing.join(', ')}`;
  return null;
}

module.exports = { validate };
