const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { SEGMENTS_DIR, UPLOADS_DIR } = require("../config/paths");
const { dbAll, dbGet, dbRun } = require("../utils/dbHelpers");
const { storeSegmentOnNode, fetchSegmentFromNode, deleteSegmentFromNode } = require("./nodeClient");

const CHUNK_SIZE_BYTES = 1024 * 1024;
const TARGET_REPLICA_COUNT = 2;

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

async function segmentFileToDisk(filePath, fileId, chunkSizeBytes = CHUNK_SIZE_BYTES) {
  const fileHandle = await fs.promises.open(filePath, "r");
  await fs.promises.mkdir(path.join(SEGMENTS_DIR, String(fileId)), { recursive: true });

  let index = 0;
  let position = 0;

  try {
    while (true) {
      const buffer = Buffer.alloc(chunkSizeBytes);
      const { bytesRead } = await fileHandle.read(buffer, 0, chunkSizeBytes, position);
      if (bytesRead === 0) break;

      const chunk = buffer.subarray(0, bytesRead);
      const chunkName = `chunk-${String(index).padStart(5, "0")}.bin`;
      const chunkAbsPath = path.join(SEGMENTS_DIR, String(fileId), chunkName);

      await fs.promises.writeFile(chunkAbsPath, chunk);

      const checksum = crypto.createHash("sha256").update(chunk).digest("hex");
      const segmentRun = await dbRun(
        "INSERT INTO segments (fileId, segmentIndex, sizeBytes, checksum) VALUES (?, ?, ?, ?)",
        [fileId, index, bytesRead, checksum]
      );

      const segmentId = segmentRun.lastID;
      const activeNodes = await getActiveNodes();
      const targetNodes = activeNodes.slice(0, TARGET_REPLICA_COUNT);

      if (targetNodes.length < TARGET_REPLICA_COUNT) {
        throw new Error("Nema dovoljno aktivnih nodeova za replikaciju (trebaju 2).");
      }

      for (const node of targetNodes) {
        const response = await storeSegmentOnNode(node.baseUrl, fileId, chunkName, chunk);

        await dbRun(
          "INSERT OR IGNORE INTO segment_replicas (segmentId, nodeName, storedPath) VALUES (?, ?, ?)",
          [segmentId, node.name, response.storedPath]
        );
      }

      index += 1;
      position += bytesRead;
    }

    return { segmentsCreated: index };
  } finally {
    await fileHandle.close();
  }
}

async function rebuildFileToResponse(fileId, res) {
  const fileRow = await dbGet("SELECT * FROM files WHERE id = ?", [fileId]);
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
    const replicaCandidates = await pickReplicaPaths(fileId, segment.segmentIndex);

    if (!replicaCandidates.length) {
      throw new Error(`Missing replicas for segmentIndex=${segment.segmentIndex}`);
    }

    const chunkName = `chunk-${String(segment.segmentIndex).padStart(5, "0")}.bin`;
    let delivered = false;

    for (const replica of replicaCandidates) {
      try {
        const node = await getNodeByName(replica.nodeName);
        if (!node || Number(node.isActive) !== 1) {
          continue;
        }

        const data = await fetchSegmentFromNode(node.baseUrl, fileId, chunkName);
        const checksum = crypto.createHash("sha256").update(data).digest("hex");

        if (replica.checksum && checksum !== replica.checksum) {
          continue;
        }

        res.write(data);
        delivered = true;
        break;
      } catch {
        // failover: try next replica
      }
    }

    if (!delivered) {
      throw new Error(`No valid replica found for segmentIndex=${segment.segmentIndex}`);
    }
  }

  res.end();
  return { notFound: false, fileRow };
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
  segmentFileToDisk,
  rebuildFileToResponse,
  deleteFileArtifacts,
};
