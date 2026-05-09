const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function getDbConfig() {
  if (process.env.DATABASE_URL) {
    // Neon, Supabase y otros proveedores cloud requieren SSL.
    // Algunos no traen un CA en cadena pública (self-signed): permitimos
    // desactivar la validación con DB_SSL_REJECT_UNAUTHORIZED=false.
    const rejectUnauthorized =
      String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'false').toLowerCase() !== 'false';

    return {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized,
        },
      },
      define: {
        underscored: true,
        freezeTableName: true,
      },
    };
  }

  return {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true,
    },
  };
}

module.exports = {
  development: getDbConfig(),
  test: getDbConfig(),
  production: getDbConfig(),
};
