const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const db = require('../models');
const seedAdmin = require('./services/seedAdmin');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function main() {
  await db.sequelize.authenticate();

  await seedAdmin({ autoSeed: process.env.AUTO_SEED_ADMIN !== 'false' });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] escuchando en http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[backend] error al iniciar:', err);
  process.exit(1);
});
