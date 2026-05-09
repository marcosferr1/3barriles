const { Op } = require('sequelize');
const db = require('../../models');
const { isDefaultSupplierRow } = require('../services/defaultSupplier');
const { parsePagination } = require('../utils/pagination');

const Supplier = db.Supplier;

async function list(req, res, next) {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    const where = q ? { name: { [Op.iLike]: `%${q}%` } } : {};
    const { page, pageSize, limit, offset } = parsePagination(req.query);

    const total = await Supplier.count({ where });
    const rows = await Supplier.findAll({ where, order: [['name', 'ASC']], limit, offset });
    return res.json({ items: rows, total, page, pageSize });
  } catch (e) {
    return next(e);
  }
}

async function get(req, res, next) {
  try {
    const row = await Supplier.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    return res.json(row);
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  try {
    const name = req.body?.name?.trim();
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const row = await Supplier.create({
      name,
      phone: req.body?.phone?.trim() || null,
      email: req.body?.email?.trim() || null,
      notes: req.body?.notes?.trim() || null,
    });
    return res.status(201).json(row);
  } catch (e) {
    return next(e);
  }
}

async function update(req, res, next) {
  try {
    const row = await Supplier.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    if (
      req.body.name !== undefined &&
      isDefaultSupplierRow(row) &&
      String(req.body.name).trim() !== row.name
    ) {
      return res.status(400).json({ error: 'No se puede renombrar el proveedor interno por defecto' });
    }
    if (req.body.name !== undefined) row.name = String(req.body.name).trim() || row.name;
    if (req.body.phone !== undefined) row.phone = req.body.phone?.trim() || null;
    if (req.body.email !== undefined) row.email = req.body.email?.trim() || null;
    if (req.body.notes !== undefined) row.notes = req.body.notes?.trim() || null;
    await row.save();
    return res.json(row);
  } catch (e) {
    return next(e);
  }
}

async function remove(req, res, next) {
  try {
    const row = await Supplier.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    if (isDefaultSupplierRow(row)) {
      return res.status(400).json({ error: 'No se puede eliminar el proveedor interno por defecto' });
    }
    const anyPo = await db.PurchaseOrder.count({ where: { supplierId: row.id } });
    if (anyPo > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: hay órdenes de compra asociadas' });
    }
    const anyProd = await db.Product.count({ where: { supplierId: row.id } });
    if (anyProd > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: hay productos asociados a este proveedor' });
    }
    await row.destroy();
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, get, create, update, remove };
