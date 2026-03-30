const express = require("express");
const multer = require("multer");
const path = require("path");
const { dbAll, dbGet, dbRun } = require("../utils/dbHelpers");
const { UPLOADS_DIR, SEGMENTS_DIR } = require("../config/paths");
const fs = require("fs");
const {
  CHUNK_SIZE_BYTES,
  segmentFileToDisk,
  rebuildFileToResponse,
  deleteFileArtifacts,
} = require("../services/storageService");

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});

async function removeDirIfExists(dirPath) {
  try {
    await fs.promises.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.error("removeDirIfExists error:", err.message);
  }
}

router.post("/upload", upload.single("file"), async (req, res) => {
  let fileId = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nema file-a (field mora biti 'file')" });
    }

    const chunkSizeBytes = CHUNK_SIZE_BYTES;

    const run = await dbRun(
      `INSERT INTO files (originalName, sizeBytes, chunkSizeBytes, storedAs) VALUES (?, ?, ?, ?)`,
      [req.file.originalname, req.file.size, chunkSizeBytes, req.file.filename]
    );

    fileId = run.lastID;

    const segResult = await segmentFileToDisk(req.file.path, fileId, chunkSizeBytes);

    return res.status(201).json({
      fileId,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      storedAs: req.file.filename,
      chunkSizeBytes,
      ...segResult,
    });
  } catch (e) {
    try {
      if (req.file?.path) {
        await fs.promises.unlink(req.file.path).catch(() => { });
      }

      if (fileId !== null) {
        await removeDirIfExists(path.join(SEGMENTS_DIR, String(fileId)));

        try {
          await deleteFileArtifacts(fileId, null);
        } catch (artifactCleanupErr) {
          console.error("Artifact cleanup error:", artifactCleanupErr.message);
        }

        try {
          await dbRun("DELETE FROM files WHERE id = ?", [fileId]);
        } catch (dbCleanupErr) {
          console.error("DB cleanup error:", dbCleanupErr.message);
        }
      }
    } catch (cleanupErr) {
      console.error("Upload cleanup error:", cleanupErr.message);
    }

    return res.status(500).json({ error: e.message || String(e) });
  }
});

router.get("/files", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM files ORDER BY id DESC;");
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/files/:id/segments", async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const rows = await dbAll(
      "SELECT * FROM segments WHERE fileId = ? ORDER BY segmentIndex ASC;",
      [fileId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/files/:id/replicas", async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const rows = await dbAll(
      `
        SELECT sr.*, s.segmentIndex
        FROM segment_replicas sr
        JOIN segments s ON sr.segmentId = s.id
        WHERE s.fileId = ?
        ORDER BY s.segmentIndex ASC, sr.nodeName ASC
      `,
      [fileId]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/files/:id/details", async (req, res) => {
  try {
    const fileId = Number(req.params.id);

    const file = await dbGet("SELECT * FROM files WHERE id = ?", [fileId]);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const segments = await dbAll(
      "SELECT * FROM segments WHERE fileId = ? ORDER BY segmentIndex ASC;",
      [fileId]
    );

    const replicas = await dbAll(
      `
        SELECT sr.*, s.segmentIndex
        FROM segment_replicas sr
        JOIN segments s ON sr.segmentId = s.id
        WHERE s.fileId = ?
        ORDER BY s.segmentIndex ASC, sr.nodeName ASC
      `,
      [fileId]
    );

    return res.json({
      file,
      segments,
      replicas,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

router.delete("/files/:id", async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const fileRow = await dbGet("SELECT * FROM files WHERE id = ?", [fileId]);

    if (!fileRow) {
      return res.status(404).json({ error: "File not found" });
    }

    await deleteFileArtifacts(fileId, fileRow.storedAs);
    await dbRun("DELETE FROM files WHERE id = ?", [fileId]);

    return res.json({ deleted: true, fileId, originalName: fileRow.originalName });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || String(error) });
  }
});

router.get("/files/:id/download", async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const result = await rebuildFileToResponse(fileId, res);

    if (result.notFound) {
      return res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    return res.status(500).end(JSON.stringify({ error: error.message || String(error) }));
  }
});

module.exports = router;