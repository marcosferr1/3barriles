const db = require('../../models');
const inventory = require('../services/inventory.service');
const { parsePagination } = require('../utils/pagination');

async function list(req, res, next) {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);

    const total = await db.PurchaseOrder.count();

    const rows = await db.PurchaseOrder.findAll({
      order: [['created_at', 'DESC']],
      include: [
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: db.PurchaseOrderLine, as: 'lines', include: [{ model: db.Product, as: 'product', attributes: ['id', 'name', 'sku'] }] },
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
    const row = await db.PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: db.Supplier, as: 'supplier' },
        { model: db.PurchaseOrderLine, as: 'lines', include: [{ model: db.Product, as: 'product' }] },
      ],
    });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    return res.json(row);
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  try {
    const supplierId = req.body?.supplierId;
    if (!supplierId) return res.status(400).json({ error: 'Proveedor requerido' });

    const sup = await db.Supplier.findByPk(supplierId);
    if (!sup) return res.status(400).json({ error: 'Proveedor inválido' });

    const id = await inventory.createDraftPurchase(req.user.id, {
      supplierId,
      orderedAt: req.body?.orderedAt,
      lines: req.body?.lines || [],
    });
    const row = await db.PurchaseOrder.findByPk(id, {
      include: [
        { model: db.Supplier, as: 'supplier' },
        { model: db.PurchaseOrderLine, as: 'lines', include: [{ model: db.Product, as: 'product' }] },
      ],
    });
    return res.status(201).json(row);
  } catch (e) {
    const code = e.statusCode || 500;
    if (code >= 400 && code < 500) return res.status(code).json({ error: e.message });
    return next(e);
  }
}

async function receive(req, res, next) {
  try {
    await inventory.receivePurchaseOrder(req.params.id, req.user.id);
    const row = await db.PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: db.Supplier, as: 'supplier' },
        { model: db.PurchaseOrderLine, as: 'lines', include: [{ model: db.Product, as: 'product' }] },
      ],
    });
    return res.json(row);
  } catch (e) {
    const code = e.statusCode || 500;
    if (code >= 400 && code < 500) return res.status(code).json({ error: e.message });
    return next(e);
  }
}

module.exports = { list, get, create, receive };
