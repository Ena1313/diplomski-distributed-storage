const path = require('path');

const ROOT_DIR = __dirname ? path.join(__dirname, '..') : process.cwd();

module.exports = {
  ROOT_DIR,
  DATA_DIR: path.join(ROOT_DIR, 'data'),
  UPLOADS_DIR: path.join(ROOT_DIR, 'uploads'),
  SEGMENTS_DIR: path.join(ROOT_DIR, 'segments'),
  DB_PATH: path.join(ROOT_DIR, 'data', 'storage.db'),
};
