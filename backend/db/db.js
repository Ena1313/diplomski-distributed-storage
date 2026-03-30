const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('../config/paths');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('SQLite connect error:', err.message);
  } else {
    console.log('Connected to SQLite:', DB_PATH);
  }
});

module.exports = db;
