const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 4001;
const NODE_NAME = process.env.NODE_NAME || "node-1";
const STORAGE_DIR = process.env.STORAGE_DIR || "/data/storage";

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

function validateFileId(fileId) {
  return /^\d+$/.test(String(fileId));
}

function validateChunkName(chunkName) {
  return /^chunk-\d{5}\.bin$/.test(String(chunkName));
}

function safeResolveStoragePath(fileId, chunkName) {
  if (!validateFileId(fileId)) {
    throw new Error("Invalid fileId.");
  }

  if (!validateChunkName(chunkName)) {
    throw new Error("Invalid chunkName.");
  }

  const fileDir = path.resolve(STORAGE_DIR, String(fileId));
  const absPath = path.resolve(fileDir, chunkName);
  const normalizedStorageDir = path.resolve(STORAGE_DIR);

  if (
    !fileDir.startsWith(normalizedStorageDir + path.sep) &&
    fileDir !== normalizedStorageDir
  ) {
    throw new Error("Invalid storage path.");
  }

  if (!absPath.startsWith(fileDir + path.sep)) {
    throw new Error("Path traversal detected.");
  }

  return { fileDir, absPath };
}

app.get("/health", async (req, res) => {
  res.json({
    ok: true,
    nodeName: NODE_NAME,
    storageDir: STORAGE_DIR,
  });
});

app.post("/store-segment", async (req, res) => {
  try {
    const { fileId, chunkName, contentBase64 } = req.body;

    if (!fileId || !chunkName || !contentBase64) {
      return res.status(400).json({ error: "fileId, chunkName and contentBase64 are required." });
    }

    const { fileDir, absPath } = safeResolveStoragePath(fileId, chunkName);
    await ensureDir(fileDir);

    const buffer = Buffer.from(contentBase64, "base64");
    await fs.promises.writeFile(absPath, buffer);

    return res.status(201).json({
      message: "Segment stored",
      nodeName: NODE_NAME,
      storedPath: absPath,
    });
  } catch (e) {
    if (
      e.message === "Invalid fileId." ||
      e.message === "Invalid chunkName." ||
      e.message === "Invalid storage path." ||
      e.message === "Path traversal detected."
    ) {
      return res.status(400).json({ error: e.message });
    }

    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/segment", async (req, res) => {
  try {
    const { fileId, chunkName } = req.query;

    if (!fileId || !chunkName) {
      return res.status(400).json({ error: "fileId and chunkName are required." });
    }

    const { absPath } = safeResolveStoragePath(fileId, chunkName);
    const buffer = await fs.promises.readFile(absPath);

    return res.json({
      nodeName: NODE_NAME,
      contentBase64: buffer.toString("base64"),
    });
  } catch (e) {
    if (
      e.message === "Invalid fileId." ||
      e.message === "Invalid chunkName." ||
      e.message === "Invalid storage path." ||
      e.message === "Path traversal detected."
    ) {
      return res.status(400).json({ error: e.message });
    }

    return res.status(404).json({ error: "Segment not found." });
  }
});

app.delete("/segment", async (req, res) => {
  try {
    const { fileId, chunkName } = req.query;

    if (!fileId || !chunkName) {
      return res.status(400).json({ error: "fileId and chunkName are required." });
    }

    const { absPath } = safeResolveStoragePath(fileId, chunkName);
    await fs.promises.unlink(absPath);

    return res.json({
      message: "Segment deleted",
      nodeName: NODE_NAME,
    });
  } catch (e) {
    if (
      e.message === "Invalid fileId." ||
      e.message === "Invalid chunkName." ||
      e.message === "Invalid storage path." ||
      e.message === "Path traversal detected."
    ) {
      return res.status(400).json({ error: e.message });
    }

    return res.status(404).json({ error: "Segment not found." });
  }
});

app.listen(PORT, () => {
  console.log(`Node service ${NODE_NAME} listening on port ${PORT}`);
});