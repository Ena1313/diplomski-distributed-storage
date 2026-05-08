const express = require('express');
const {
  isRebalanceRunning,
  setRebalanceRunning,
  rebalanceSingleFile,
  rebalanceAllFiles,
} = require('../services/rebalanceService');

const router = express.Router();

router.post('/rebalance/:fileId', async (req, res) => {//Rebalance se može pokrenuti za jedan file.
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
    return res.status(409).json({ error: 'Rebalance already running' }); //zaštitu da se ne pokrene dvaput odjednom
  }

  setRebalanceRunning(true);

  try {
    const result = await rebalanceAllFiles();//Rebalance se može pokrenuti za sve fileove.
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  } finally {
    setRebalanceRunning(false);
  }
});

module.exports = router;
