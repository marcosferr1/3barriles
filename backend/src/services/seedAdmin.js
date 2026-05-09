const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../models');

function getRequiredEnv(name) {
  return process.env[name] && process.env[name].trim() ? process.env[name].trim() : null;
}

/** Crea ADMIN si ADMIN_EMAIL/PASS están definidas y no existe. Seguro ejecutar más de una vez. */
async function ensureAdminFromEnv() {
  const email = getRequiredEnv('ADMIN_EMAIL');
  const password = getRequiredEnv('ADMIN_PASSWORD');

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.warn('[seedAdmin] ADMIN_EMAIL o ADMIN_PASSWORD no definidos. No se creará usuario admin.');
    return { ok: false, reason: 'missing_env' };
  }

  try {
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      // eslint-disable-next-line no-console
      console.log(`[seedAdmin] Admin ya existe (${email}), no se crea de nuevo.`);
      return { ok: true, reason: 'already_exists' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await db.User.create({
      id,
      email,
      passwordHash,
      role: 'ADMIN',
    });

    // eslint-disable-next-line no-console
    console.log(`[seedAdmin] Usuario ADMIN creado (${email}). Podés iniciar sesión en /login.`);
    return { ok: true, reason: 'created' };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[seedAdmin] Error al crear admin:', e.message || e);
    throw e;
  }
}

async function seedAdmin({ autoSeed = true } = {}) {
  if (!autoSeed) return;
  await ensureAdminFromEnv();
}

module.exports = seedAdmin;
module.exports.ensureAdminFromEnv = ensureAdminFromEnv;
