const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { SEGMENTS_DIR, UPLOADS_DIR } = require("../config/paths");
const { dbAll, dbGet, dbRun } = require("../utils/dbHelpers");
const { storeSegmentOnNode, fetchSegmentFromNode, deleteSegmentFromNode } = require("./nodeClient");

const CHUNK_SIZE_BYTES = 1024 * 1024;//ovdje postavljam segment velicine 1MB
const TARGET_REPLICA_COUNT = 2;//dvije replike

async function removeDirIfExists(dirPath) {
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.error('removeDirIfExists error:', err.message);
  }
}

async function getActiveNodes() {
  return dbAll(
    "SELECT DISTINCT name, baseUrl FROM nodes WHERE isActive = 1 ORDER BY name ASC;"
  );
}

async function getNodeByName(nodeName) {
  return dbGet("SELECT name, baseUrl, isActive FROM nodes WHERE name = ?", [nodeName]);
}

async function pickReplicaPaths(fileId, segmentIndex) {
  return dbAll(
    `
      SELECT sr.nodeName, sr.storedPath, s.checksum
      FROM segment_replicas sr
      JOIN segments s ON sr.segmentId = s.id
      WHERE s.fileId = ? AND s.segmentIndex = ?
      ORDER BY sr.nodeName ASC
    `,
    [fileId, segmentIndex]
  );
}

function pickRoundRobinNodes(activeNodes, replicaCount, fileId) {
  if (activeNodes.length < replicaCount) {
    throw new Error("Not enough active nodes for replication.");
  }

  const startIndex = (Number(fileId) - 1) % activeNodes.length;
  const selectedNodes = [];

  for (let i = 0; i < replicaCount; i += 1) {
    const nodeIndex = (startIndex + i) % activeNodes.length;
    selectedNodes.push(activeNodes[nodeIndex]);
  }

  return selectedNodes;
}

async function segmentFileToDisk(filePath, fileId, chunkSizeBytes = CHUNK_SIZE_BYTES) {
  const fileHandle = await fs.promises.open(filePath, "r");
  await fs.promises.mkdir(path.join(SEGMENTS_DIR, String(fileId)), { recursive: true });

  let index = 0;
  let position = 0;

  const activeNodes = await getActiveNodes();//Adrese nodeova dolaze iz baze
  if (activeNodes.length < TARGET_REPLICA_COUNT) {
    throw new Error("Not enough active nodes for replication.");
  }

  const targetNodes = pickRoundRobinNodes(activeNodes, TARGET_REPLICA_COUNT, fileId);//Zatim backend bira nodeove (round robin) na koje će poslati segmente.

  try {
    while (true) {
      const buffer = Buffer.alloc(chunkSizeBytes);
      const { bytesRead } = await fileHandle.read(buffer, 0, chunkSizeBytes, position);
      if (bytesRead === 0) break;

      const chunk = buffer.subarray(0, bytesRead);
      const chunkName = `chunk-${String(index).padStart(5, "0")}.bin`;
      const chunkAbsPath = path.join(SEGMENTS_DIR, String(fileId), chunkName);

      await fs.promises.writeFile(chunkAbsPath, chunk);//spremi lokalno segmente filea

      const checksum = crypto.createHash("sha256").update(chunk).digest("hex");//checksum otisak prsta segmenta
      const segmentRun = await dbRun(
        "INSERT INTO segments (fileId, segmentIndex, sizeBytes, checksum) VALUES (?, ?, ?, ?)",
        [fileId, index, bytesRead, checksum]
      );

      const segmentId = segmentRun.lastID;

      for (const node of targetNodes) {
        const response = await storeSegmentOnNode(node.baseUrl, fileId, chunkName, chunk);//Za svaki node backend šalje HTTP POST zahtjev.

        await dbRun(
          "INSERT OR IGNORE INTO segment_replicas (segmentId, nodeName, storedPath) VALUES (?, ?, ?)",
          [segmentId, node.name, response.storedPath]
        );
      }

      index += 1;
      position += bytesRead;
    }

    return { segmentsCreated: index, targetNodes: targetNodes.map((node) => node.name) };
  } finally {
    await fileHandle.close();
  }
}

async function rebuildFileToResponse(fileId, res) {//za download filea
  const fileRow = await dbGet("SELECT * FROM files WHERE id = ?", [fileId]); //uzmi redom segmente po indexid i rekonstruiraj ih
  if (!fileRow) {
    return { notFound: true };
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${fileRow.originalName}"`);

  const segments = await dbAll(
    "SELECT * FROM segments WHERE fileId = ? ORDER BY segmentIndex ASC;",
    [fileId]
  );

  for (const segment of segments) {
    const replicaCandidates = await pickReplicaPaths(fileId, segment.segmentIndex);//za svaki segment trazi dostupne replike u bazi

    if (!replicaCandidates.length) {
      throw new Error(`Missing replicas for segmentIndex=${segment.segmentIndex}`);
    }

    const chunkName = `chunk-${String(segment.segmentIndex).padStart(5, "0")}.bin`;
    let delivered = false;

    for (const replica of replicaCandidates) {//failover
      try {
        const node = await getNodeByName(replica.nodeName);
        if (!node || Number(node.isActive) !== 1) {
          continue;
        }

        const data = await fetchSegmentFromNode(node.baseUrl, fileId, chunkName);//“Ovo je HTTP GET prema nodeu. Backend traži konkretan segment.”
        const checksum = crypto.createHash("sha256").update(data).digest("hex");
        //ako jedan node ne radi, ako nije active, ako GET request pukne ili checksum nije dobar, backend ide na continue i proba sljedeću repliku.”

        if (replica.checksum && checksum !== replica.checksum) {
          continue;
        }

        res.write(data);
        delivered = true;
        break;
      } catch {
        // failover: try next replica
        //Ova petlja prolazi kroz replike dok ne pronađe onu koja je dostupna i ispravna.
      }
    }

    if (!delivered) {
      throw new Error(`No valid replica found for segmentIndex=${segment.segmentIndex}`);
    }
  }

  res.end();
  return { notFound: false, fileRow };
}

async function getFileDetailsWithLiveHealth(fileId) {
  const file = await dbGet("SELECT * FROM files WHERE id = ?", [fileId]);

  if (!file) {
    return null;
  }

  const segments = await dbAll(
    "SELECT * FROM segments WHERE fileId = ? ORDER BY segmentIndex ASC;",
    [fileId]
  );

  const replicas = await dbAll(
    `
      SELECT sr.*, s.segmentIndex, s.checksum
      FROM segment_replicas sr
      JOIN segments s ON sr.segmentId = s.id
      WHERE s.fileId = ?
      ORDER BY s.segmentIndex ASC, sr.nodeName ASC
    `,
    [fileId]
  );

  const nodes = await dbAll("SELECT name, baseUrl, isActive FROM nodes;");
  const nodeMap = new Map(nodes.map((node) => [node.name, node]));

  const validReplicaCountBySegmentId = new Map();
  const checkedReplicas = [];

  for (const replica of replicas) {
    const node = nodeMap.get(replica.nodeName);
    const chunkName = `chunk-${String(replica.segmentIndex).padStart(5, "0")}.bin`;

    let actualStatus = "OK";
    let actualExists = false;

    if (!node) {
      actualStatus = "NODE NOT FOUND";
    } else if (Number(node.isActive) !== 1) {
      actualStatus = "NODE INACTIVE";
    } else {
      try {
        const data = await fetchSegmentFromNode(node.baseUrl, fileId, chunkName);
        const checksum = crypto.createHash("sha256").update(data).digest("hex");

        if (replica.checksum && checksum !== replica.checksum) {
          actualStatus = "CHECKSUM MISMATCH";
        } else {
          actualExists = true;
          const currentCount = validReplicaCountBySegmentId.get(replica.segmentId) || 0;
          validReplicaCountBySegmentId.set(replica.segmentId, currentCount + 1);
        }
      } catch {
        actualStatus = "MISSING ON DISK";
      }
    }

    checkedReplicas.push({
      ...replica,
      actualExists,
      actualStatus,
    });
  }

  const checkedSegments = segments.map((segment) => {
    const validReplicaCount = validReplicaCountBySegmentId.get(segment.id) || 0;

    let healthStatus = "Missing";

    if (validReplicaCount >= TARGET_REPLICA_COUNT) {
      healthStatus = "Healthy";
    } else if (validReplicaCount > 0) {
      healthStatus = "Degraded";
    }

    return {
      ...segment,
      validReplicaCount,
      targetReplicaCount: TARGET_REPLICA_COUNT,
      healthStatus,
    };
  });

  let fileHealthStatus = "Healthy";

  if (checkedSegments.some((segment) => segment.healthStatus === "Missing")) {
    fileHealthStatus = "Missing";
  } else if (checkedSegments.some((segment) => segment.healthStatus === "Degraded")) {
    fileHealthStatus = "Degraded";
  }

  return {
    file,
    segments: checkedSegments,
    replicas: checkedReplicas,
    healthStatus: fileHealthStatus,
  };
}

async function deleteFileArtifacts(fileId, storedAs) {
  if (storedAs) {
    const uploadPath = path.join(UPLOADS_DIR, storedAs);
    try {
      await fs.promises.unlink(uploadPath);
    } catch {
      // ignore
    }
  }

  await removeDirIfExists(path.join(SEGMENTS_DIR, String(fileId)));

  const replicas = await dbAll(
    `
      SELECT sr.nodeName, s.segmentIndex
      FROM segment_replicas sr
      JOIN segments s ON s.id = sr.segmentId
      WHERE s.fileId = ?
      ORDER BY s.segmentIndex ASC
    `,
    [fileId]
  );

  for (const replica of replicas) {
    try {
      const node = await getNodeByName(replica.nodeName);
      if (!node) continue;

      const chunkName = `chunk-${String(replica.segmentIndex).padStart(5, "0")}.bin`;
      await deleteSegmentFromNode(node.baseUrl, fileId, chunkName);
    } catch {
      // ignore missing remote files
    }
  }
}

module.exports = {
  CHUNK_SIZE_BYTES,
  TARGET_REPLICA_COUNT,
  removeDirIfExists,
  getActiveNodes,
  getNodeByName,
  pickReplicaPaths,
  pickRoundRobinNodes,
  segmentFileToDisk,
  rebuildFileToResponse,
  getFileDetailsWithLiveHealth,
  deleteFileArtifacts,
};