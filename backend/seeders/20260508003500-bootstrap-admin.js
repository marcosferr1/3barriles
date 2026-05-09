'use strict';

const path = require('path');

// Mismo .env que el resto del repo (compose exporta estas vars al contenedor)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  /** @param {import('sequelize').QueryInterface} _queryInterface */
  async up(_queryInterface) {
    const { ensureAdminFromEnv } = require('../src/services/seedAdmin');
    await ensureAdminFromEnv();
  },

  async down(queryInterface) {
    const email = process.env.ADMIN_EMAIL?.trim();
    if (!email) return;
    await queryInterface.bulkDelete('users', { email });
  },
};
