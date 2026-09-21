// server/routes/capsules.js
//
// CRUD for the `capsules` table. Every route here is mounted behind
// `requireAuth` in server/index.js, so req.user.id is always a verified
// GitHub user id taken from the JWT - never from the request body/query.

const express = require('express');
const db = require('../db');

const router = express.Router();

const REQUIRED_FIELDS = ['project_name', 'prompt_title', 'prompt_text'];

const OPTIONAL_TEXT_FIELDS = [
  'prompt_version',
  'response_summary',
  'category',
  'usefulness',
  'screenshot_url',
  'notes',
];

function toBoolInt(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

function serializeRow(row) {
  return {
    id: row.id,
    project_name: row.project_name,
    prompt_title: row.prompt_title,
    prompt_version: row.prompt_version,
    prompt_text: row.prompt_text,
    response_summary: row.response_summary,
    category: row.category,
    usefulness: row.usefulness,
    reviewed: !!row.reviewed,
    improved: !!row.improved,
    screenshot_url: row.screenshot_url,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function validateBody(body) {
  const missing = REQUIRED_FIELDS.filter((f) => !body[f] || String(body[f]).trim() === '');
  if (missing.length) {
    return `Missing required field(s): ${missing.join(', ')}`;
  }
  return null;
}

// GET /api/capsules - list only the authenticated user's own records.
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.user.id);
  res.json(rows.map(serializeRow));
});

// POST /api/capsules - create a record owned by the authenticated user.
router.post('/', (req, res) => {
  const body = req.body || {};
  const validationError = validateBody(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const stmt = db.prepare(`
    INSERT INTO capsules
      (user_id, project_name, prompt_title, prompt_version, prompt_text,
       response_summary, category, usefulness, reviewed, improved,
       screenshot_url, notes)
    VALUES
      (@user_id, @project_name, @prompt_title, @prompt_version, @prompt_text,
       @response_summary, @category, @usefulness, @reviewed, @improved,
       @screenshot_url, @notes)
  `);

  const info = stmt.run({
    user_id: req.user.id, // <- from the verified JWT, never from the client
    project_name: body.project_name,
    prompt_title: body.prompt_title,
    prompt_version: body.prompt_version || null,
    prompt_text: body.prompt_text,
    response_summary: body.response_summary || null,
    category: body.category || null,
    usefulness: body.usefulness || null,
    reviewed: toBoolInt(body.reviewed),
    improved: toBoolInt(body.improved),
    screenshot_url: body.screenshot_url || null,
    notes: body.notes || null,
  });

  const row = db.prepare('SELECT * FROM capsules WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeRow(row));
});

// PUT /api/capsules/:id - update a record, only if it belongs to the caller.
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const existing = db.prepare('SELECT * FROM capsules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Capsule not found' });
  }
  if (existing.user_id !== req.user.id) {
    // Deliberately 404, not 403: don't reveal that a record with this id
    // exists for a different user.
    return res.status(404).json({ error: 'Capsule not found' });
  }

  const body = req.body || {};
  const validationError = validateBody({ ...existing, ...body });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const merged = {
    project_name: body.project_name ?? existing.project_name,
    prompt_title: body.prompt_title ?? existing.prompt_title,
    prompt_version: body.prompt_version ?? existing.prompt_version,
    prompt_text: body.prompt_text ?? existing.prompt_text,
    response_summary: body.response_summary ?? existing.response_summary,
    category: body.category ?? existing.category,
    usefulness: body.usefulness ?? existing.usefulness,
    reviewed: body.reviewed !== undefined ? toBoolInt(body.reviewed) : existing.reviewed,
    improved: body.improved !== undefined ? toBoolInt(body.improved) : existing.improved,
    screenshot_url: body.screenshot_url ?? existing.screenshot_url,
    notes: body.notes ?? existing.notes,
  };

  db.prepare(`
    UPDATE capsules SET
      project_name = @project_name,
      prompt_title = @prompt_title,
      prompt_version = @prompt_version,
      prompt_text = @prompt_text,
      response_summary = @response_summary,
      category = @category,
      usefulness = @usefulness,
      reviewed = @reviewed,
      improved = @improved,
      screenshot_url = @screenshot_url,
      notes = @notes
    WHERE id = @id AND user_id = @user_id
  `).run({ ...merged, id, user_id: req.user.id });

  const updated = db.prepare('SELECT * FROM capsules WHERE id = ?').get(id);
  res.json(serializeRow(updated));
});

// DELETE /api/capsules/:id - delete a record, only if it belongs to the caller.
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const existing = db.prepare('SELECT * FROM capsules WHERE id = ?').get(id);
  if (!existing || existing.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Capsule not found' });
  }

  db.prepare('DELETE FROM capsules WHERE id = ? AND user_id = ?').run(id, req.user.id);
  res.status(204).end();
});

module.exports = router;
