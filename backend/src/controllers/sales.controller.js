const db = require('../../models');
const inventory = require('../services/inventory.service');
const { parsePagination } = require('../utils/pagination');

/** Ventas donde ninguna línea es mercadería con stock (solo tragos BAR). */
function barSalesWhereLiteral() {
  return db.sequelize.literal(`NOT EXISTS (
    SELECT 1 FROM sale_lines sl
    INNER JOIN products p ON p.id = sl.product_id
    WHERE sl.sale_id = "Sale"."id" AND p.tracks_stock = true
  )`);
}

async function list(req, res, next) {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const barSales = req.query.barSales === 'true';

    const where = barSales ? barSalesWhereLiteral() : {};

    const total = await db.Sale.count({ where });

    const rows = await db.Sale.findAll({
      where,
      order: [['sold_at', 'DESC']],
      include: [
        {
          model: db.SaleLine,
          as: 'lines',
          attributes: ['id', 'qty', 'unitPrice', 'happyHourApplied', 'lineDescription'],
          include: [{ model: db.Product, as: 'product', attributes: ['id', 'name', 'sku', 'tracksStock'] }],
        },
      ],
      limit,
      offset,
    });
    return res.json({ items: rows, total, page, pageSize });
  } catch (e) {
    return next(e);
  }
}

async function get(req, res, next) {
  try {
    const row = await db.Sale.findByPk(req.params.id, {
      include: [{ model: db.SaleLine, as: 'lines', include: [{ model: db.Product, as: 'product' }] }],
    });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    return res.json(row);
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  try {
    const paymentMethod = req.body?.paymentMethod;
    const lines = req.body?.lines;
    const id = await inventory.createSale(req.user.id, { paymentMethod, lines });
    const row = await db.Sale.findByPk(id, {
      include: [{ model: db.SaleLine, as: 'lines', include: [{ model: db.Product, as: 'product' }] }],
    });
    return res.status(201).json(row);
  } catch (e) {
    const code = e.statusCode || 500;
    if (code >= 400 && code < 500) return res.status(code).json({ error: e.message });
    return next(e);
  }
}

module.exports = { list, get, create };
