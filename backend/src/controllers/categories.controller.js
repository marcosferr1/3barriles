const { Op } = require('sequelize');
const db = require('../../models');
const { parsePagination } = require('../utils/pagination');

const Category = db.Category;

async function list(req, res, next) {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const q = req.query.q ? String(req.query.q).trim() : '';
    const where = q ? { name: { [Op.iLike]: `%${q}%` } } : {};

    const total = await Category.count({ where });
    const rows = await Category.findAll({ where, order: [['name', 'ASC']], limit, offset });
    return res.json({ items: rows, total, page, pageSize });
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  try {
    const name = req.body?.name?.trim();
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const row = await Category.create({ name });
    return res.status(201).json(row);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'La categoría ya existe' });
    }
    return next(e);
  }
}

async function update(req, res, next) {
  try {
    const row = await Category.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const name = req.body?.name?.trim();
    if (name) {
      row.name = name;
    } else if (req.body?.name !== undefined) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }
    await row.save();
    return res.json(row);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    return next(e);
  }
}

async function remove(req, res, next) {
  try {
    const row = await Category.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });

    await db.Product.update({ categoryId: null }, { where: { categoryId: row.id } });
    await row.destroy();
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, create, update, remove };
