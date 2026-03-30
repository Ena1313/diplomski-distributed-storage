const { dbAll, dbRun } = require("../utils/dbHelpers");
const { getActiveNodes, getNodeByName, TARGET_REPLICA_COUNT } = require("./storageService");
const { fetchSegmentFromNode, storeSegmentOnNode } = require("./nodeClient");

let rebalanceRunning = false;

function isRebalanceRunning() {
  return rebalanceRunning;
}

function setRebalanceRunning(value) {
  rebalanceRunning = value;
}

async function rebalanceSingleFile(fileId) {
  const activeNodes = await getActiveNodes();
  if (activeNodes.length < TARGET_REPLICA_COUNT) {
    throw new Error("Trebaju barem 2 aktivna node-a za rebalance.");
  }

  const activeNodeNames = activeNodes.map((n) => n.name);
  const activeNodeMap = new Map(activeNodes.map((n) => [n.name, n]));
  const activeSet = new Set(activeNodeNames);

  const segments = await dbAll(
    "SELECT id, segmentIndex FROM segments WHERE fileId = ? ORDER BY segmentIndex ASC;",
    [fileId]
  );

  const results = [];

  for (const segment of segments) {
    const replicas = await dbAll(
      "SELECT id, segmentId, nodeName, storedPath FROM segment_replicas WHERE segmentId = ? ORDER BY nodeName ASC;",
      [segment.id]
    );

    const existing = [];
    const chunkName = `chunk-${String(segment.segmentIndex).padStart(5, "0")}.bin`;

    for (const replica of replicas) {
      if (!activeSet.has(replica.nodeName)) {
        await dbRun("DELETE FROM segment_replicas WHERE id = ?", [replica.id]);
        continue;
      }

      try {
        const node = activeNodeMap.get(replica.nodeName);
        await fetchSegmentFromNode(node.baseUrl, fileId, chunkName);
        existing.push(replica);
      } catch {
        await dbRun("DELETE FROM segment_replicas WHERE id = ?", [replica.id]);
      }
    }

    if (existing.length === 0) {
      results.push({
        segmentIndex: segment.segmentIndex,
        status: "FAILED",
        reason: "No existing replicas on active nodes (need at least 1 source replica)",
      });
      continue;
    }

    const source = existing[0];
    const sourceNode = activeNodeMap.get(source.nodeName);
    const sourceBuffer = await fetchSegmentFromNode(sourceNode.baseUrl, fileId, chunkName);

    const existingNodes = new Set(existing.map((item) => item.nodeName));

    for (const node of activeNodes) {
      if (existingNodes.size >= TARGET_REPLICA_COUNT) break;
      if (existingNodes.has(node.name)) continue;

      const response = await storeSegmentOnNode(node.baseUrl, fileId, chunkName, sourceBuffer);

      await dbRun(
        "INSERT OR IGNORE INTO segment_replicas (segmentId, nodeName, storedPath) VALUES (?, ?, ?)",
        [segment.id, node.name, response.storedPath]
      );

      existingNodes.add(node.name);
      results.push({
        segmentIndex: segment.segmentIndex,
        status: "CREATED",
        nodeName: node.name,
        storedPath: response.storedPath,
      });
    }

    results.push({
      segmentIndex: segment.segmentIndex,
      status: existingNodes.size >= TARGET_REPLICA_COUNT ? "OK" : "WARN",
      replicasOnNodes: Array.from(existingNodes),
    });
  }

  return {
    fileId,
    activeNodes: activeNodeNames,
    targetReplicaCount: TARGET_REPLICA_COUNT,
    message: "rebalance done",
    results,
  };
}

async function rebalanceAllFiles() {
  const files = await dbAll('SELECT id FROM files ORDER BY id ASC;');
  const results = [];

  for (const file of files) {
    try {
      const single = await rebalanceSingleFile(file.id);
      results.push({ fileId: file.id, activeNodes: single.activeNodes, status: 'DONE', results: single.results });
    } catch (error) {
      results.push({ fileId: file.id, status: 'FAILED', reason: error.message });
    }
  }

  return {
    message: 'global rebalance done',
    filesProcessed: results.length,
    results,
  };
}

module.exports = {
  isRebalanceRunning,
  setRebalanceRunning,
  rebalanceSingleFile,
  rebalanceAllFiles,
};
