const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../models');

const User = db.User;

function validateLoginBody(body) {
  if (!body) return 'Cuerpo requerido';
  const email = body.email?.trim();
  const password = body.password;
  if (!email) return 'Email requerido';
  if (!password) return 'Password requerido';
  return null;
}

async function login(req, res, next) {
  try {
    const err = validateLoginBody(req.body);
    if (err) return res.status(400).json({ error: err });

    const email = req.body.email.trim();
    const password = req.body.password;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    return next(e);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    return next(e);
  }
}

module.exports = { login, me };
