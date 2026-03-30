const express = require('express');
const { dbAll, dbRun } = require('../utils/dbHelpers');

const router = express.Router();

router.get('/nodes', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM nodes ORDER BY id DESC;');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/nodes/overview', async (req, res) => {
  try {
    const rows = await dbAll(
      `
        SELECT
          n.id,
          n.name,
          n.baseUrl,
          n.isActive,
          n.createdAt,
          COUNT(sr.id) AS replicaCount,
          COUNT(DISTINCT sr.segmentId) AS uniqueSegmentCount,
          COUNT(DISTINCT s.fileId) AS uniqueFileCount
        FROM nodes n
        LEFT JOIN segment_replicas sr ON sr.nodeName = n.name
        LEFT JOIN segments s ON s.id = sr.segmentId
        GROUP BY n.id, n.name, n.baseUrl, n.isActive, n.createdAt
        ORDER BY n.id DESC
      `
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

router.post('/nodes', async (req, res) => {
  try {
    const { name, baseUrl } = req.body;

    if (!name || !baseUrl) {
      return res.status(400).json({ error: 'name i baseUrl su obavezni' });
    }

    const result = await dbRun('INSERT INTO nodes (name, baseUrl) VALUES (?, ?)', [name, baseUrl]);
    return res.status(201).json({ id: result.lastID, name, baseUrl, isActive: 1 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/nodes/:id', async (req, res) => {
  try {
    const nodeId = Number(req.params.id);
    const { isActive } = req.body;

    if (isActive !== 0 && isActive !== 1) {
      return res.status(400).json({ error: 'isActive mora biti 0 ili 1' });
    }

    const result = await dbRun('UPDATE nodes SET isActive = ? WHERE id = ?', [isActive, nodeId]);
    return res.json({ updated: result.changes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/nodes/:id', async (req, res) => {
  try {
    const nodeId = Number(req.params.id);
    const result = await dbRun('DELETE FROM nodes WHERE id = ?', [nodeId]);
    return res.json({ deleted: result.changes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
