const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/initDb');
const filesRoutes = require('./routes/files');
const nodesRoutes = require('./routes/nodes');
const rebalanceRoutes = require('./routes/rebalance');
const systemRoutes = require('./routes/system');

const app = express();
const port = process.env.PORT || 3000;

initDb();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get('/', (req, res) => res.send('Backend radi!'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/', filesRoutes);
app.use('/', nodesRoutes);
app.use('/', rebalanceRoutes);
app.use('/', systemRoutes);

app.listen(port, () => {
  console.log(`Server sluša na portu ${port}`);
});