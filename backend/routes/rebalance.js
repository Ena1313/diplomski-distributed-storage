const express = require('express');
const {
  isRebalanceRunning,
  setRebalanceRunning,
  rebalanceSingleFile,
  rebalanceAllFiles,
} = require('../services/rebalanceService');

const router = express.Router();

router.post('/rebalance/:fileId', async (req, res) => {
  if (isRebalanceRunning()) {
    return res.status(409).json({ error: 'Rebalance already running' });
  }

  setRebalanceRunning(true);

  try {
    const fileId = Number(req.params.fileId);
    const result = await rebalanceSingleFile(fileId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  } finally {
    setRebalanceRunning(false);
  }
});

router.post('/rebalance', async (req, res) => {
  if (isRebalanceRunning()) {
    return res.status(409).json({ error: 'Rebalance already running' });
  }

  setRebalanceRunning(true);

  try {
    const result = await rebalanceAllFiles();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  } finally {
    setRebalanceRunning(false);
  }
});

module.exports = router;
