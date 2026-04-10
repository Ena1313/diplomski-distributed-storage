const fs = require('fs');
const db = require('./db');
const { DATA_DIR, UPLOADS_DIR, SEGMENTS_DIR } = require('../config/paths');

function ensureDirectories() {
  for (const dir of [DATA_DIR, UPLOADS_DIR, SEGMENTS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function seedDefaultNodes() {
  const defaultNodes = [
    { name: 'node-1', baseUrl: 'http://node-1:4001' },
    { name: 'node-2', baseUrl: 'http://node-2:4001' },
    { name: 'node-3', baseUrl: 'http://node-3:4001' },
    { name: 'node-4', baseUrl: 'http://node-4:4001' },
    { name: 'node-5', baseUrl: 'http://node-5:4001' },
    { name: 'node-6', baseUrl: 'http://node-6:4001' },
  ];

  for (const node of defaultNodes) {
    db.run(
      `
      INSERT OR IGNORE INTO nodes (name, baseUrl, isActive)
      VALUES (?, ?, 1)
      `,
      [node.name, node.baseUrl],
      (err) => {
        if (err) {
          console.error(`Greška kod seedanja noda ${node.name}:`, err.message);
        }
      }
    );
  }

  console.log('Default nodes ensured.');
}

function initDb() {
  ensureDirectories();

  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');

    db.run(`
      CREATE TABLE IF NOT EXISTS nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        baseUrl TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        originalName TEXT NOT NULL,
        sizeBytes INTEGER NOT NULL,
        chunkSizeBytes INTEGER NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.run('ALTER TABLE files ADD COLUMN storedAs TEXT;', (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('ALTER TABLE error:', err.message);
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileId INTEGER NOT NULL,
        segmentIndex INTEGER NOT NULL,
        sizeBytes INTEGER NOT NULL,
        checksum TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
        UNIQUE(fileId, segmentIndex)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS segment_replicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        segmentId INTEGER NOT NULL,
        nodeName TEXT NOT NULL,
        storedPath TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (segmentId) REFERENCES segments(id) ON DELETE CASCADE
      );
    `);

    db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_segment_replicas_segment_node
      ON segment_replicas(segmentId, nodeName);
    `);

    db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_nodes_name
      ON nodes(name);
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS ix_segment_replicas_segmentId
      ON segment_replicas(segmentId);
    `);

    seedDefaultNodes();

    console.log('DB initialized (tables ensured).');
  });
}

module.exports = { initDb };
