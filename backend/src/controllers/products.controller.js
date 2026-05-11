const { Op } = require('sequelize');
const db = require('../../models');
const inventory = require('../services/inventory.service');
const { getDefaultSupplierId } = require('../services/defaultSupplier');
const { HAPPY_HOUR_MODES, ALLOWED_MODES } = require('../constants/happyHour');
const { parsePagination } = require('../utils/pagination');

const Product = db.Product;

function normalizeTracksStock(raw) {
  if (raw === false || raw === 'false') return false;
  return true;
}

function coerceHappyHourPayload(body, { tracksStock, prev }) {
  if (tracksStock) {
    return {
      happyHourEnabled: false,
      happyHourMode: HAPPY_HOUR_MODES.OFF,
      happyHourUnitPrice: null,
    };
  }
  const hhEn = body.happyHourEnabled !== undefined ? !!body.happyHourEnabled : prev?.happyHourEnabled ?? false;
  let mode =
    typeof body.happyHourMode === 'string' ? String(body.happyHourMode).trim() : prev?.happyHourMode ?? HAPPY_HOUR_MODES.OFF;
  if (!ALLOWED_MODES.has(mode)) mode = HAPPY_HOUR_MODES.OFF;
  let hhPrice = prev?.happyHourUnitPrice ?? null;
  if (body.happyHourUnitPrice !== undefined) {
    if (body.happyHourUnitPrice === null || body.happyHourUnitPrice === '') hhPrice = null;
    else {
      const v = Number(body.happyHourUnitPrice);
      if (!Number.isFinite(v) || v < 0) {
        throw Object.assign(new Error('Precio happy hour inválido'), { statusCode: 400 });
      }
      hhPrice = v.toFixed(2);
    }
  }
  if (!hhEn) mode = HAPPY_HOUR_MODES.OFF;
  if (hhEn && mode === HAPPY_HOUR_MODES.OFF) {
    throw Object.assign(new Error('Seleccioná un modo happy hour válido'), { statusCode: 400 });
  }
  if (hhEn && mode === HAPPY_HOUR_MODES.SPECIAL_PRICE) {
    if (hhPrice == null) {
      throw Object.assign(new Error('Modo precio especial: indicá precio happy hour'), { statusCode: 400 });
    }
  }
  return {
    happyHourEnabled: hhEn,
    happyHourMode: hhEn ? mode : HAPPY_HOUR_MODES.OFF,
    happyHourUnitPrice: hhEn && mode === HAPPY_HOUR_MODES.SPECIAL_PRICE ? hhPrice : null,
  };
}

function formatProduct(p, stock) {
  const j = p.toJSON();
  return {
    ...j,
    stock: stock ?? 0,
  };
}

async function list(req, res, next) {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    const where = {};
    if (req.query.includeInactive !== 'true') {
      where.active = true;
    }
    if (req.query.supplierId) {
      where.supplierId = String(req.query.supplierId);
    }
    /** @type {object[]} */
    const andParts = [];
    if (req.query.merchandiseForSale === 'true') {
      andParts.push({ [Op.or]: [{ tracksStock: true }, { isBundle: true }] });
    } else {
      if (req.query.tracksStock === 'true') {
        where.tracksStock = true;
      }
      if (req.query.tracksStock === 'false') {
        where.tracksStock = false;
        where.isBundle = false;
      }
    }
    if (req.query.isBundle === 'true') {
      andParts.push({ isBundle: true });
    }
    if (req.query.isBundle === 'false') {
      andParts.push({ isBundle: false });
    }
    if (q) {
      andParts.push({
        [Op.or]: [{ name: { [Op.iLike]: `%${q}%` } }, { sku: { [Op.iLike]: `%${q}%` } }],
      });
    }
    if (andParts.length) {
      where[Op.and] = andParts;
    }

    const { page, pageSize, limit, offset } = parsePagination(req.query, { maxPageSize: 200 });

    const total = await Product.count({ where });

    const include = [
      { model: db.Category, as: 'category', attributes: ['id', 'name'], required: false },
      { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
    ];
    if (req.query.withBundleItems === 'true') {
      include.push({
        model: db.ProductBundleItem,
        as: 'bundleItems',
        required: false,
        include: [{ model: db.Product, as: 'componentProduct', attributes: ['id', 'name', 'sku'], required: false }],
      });
    }

    const rows = await Product.findAll({
      where,
      include,
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    const ids = rows.map((r) => r.id);
    const componentIds = [];
    if (req.query.withBundleItems === 'true') {
      for (const r of rows) {
        for (const bi of r.bundleItems || []) {
          if (bi.componentProductId) componentIds.push(bi.componentProductId);
        }
      }
    }
    const extraIds = [...new Set(componentIds)].filter((id) => !ids.includes(id));
    const stocks = await inventory.getStockMap([...ids, ...extraIds]);
    /** @type {ReturnType<typeof formatProduct>[]} */
    let items = rows.map((r) => formatProduct(r, stocks[String(r.id)]));
    if (
      req.query.withBundleItems === 'true' &&
      req.query.merchandiseForSale === 'true' &&
      extraIds.length
    ) {
      const extraRows = await Product.findAll({
        where: { id: extraIds, active: true },
        include: [
          { model: db.Category, as: 'category', attributes: ['id', 'name'], required: false },
          { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
        ],
        order: [['name', 'ASC']],
      });
      for (const er of extraRows) {
        items.push(formatProduct(er, stocks[String(er.id)]));
      }
    }
    return res.json({ items, total, page, pageSize });
  } catch (e) {
    return next(e);
  }
}

async function get(req, res, next) {
  try {
    const row = await Product.findByPk(req.params.id, {
      include: [
        { model: db.Category, as: 'category', attributes: ['id', 'name'], required: false },
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
        {
          model: db.ProductBundleItem,
          as: 'bundleItems',
          required: false,
          include: [{ model: db.Product, as: 'componentProduct', attributes: ['id', 'name', 'sku'], required: false }],
        },
      ],
    });
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    const stock = await inventory.getStock(row.id);
    const extraComp = (row.bundleItems || []).map((b) => b.componentProductId).filter(Boolean);
    const compStocks = extraComp.length ? await inventory.getStockMap([...new Set(extraComp)]) : {};
    const j = formatProduct(row, stock);
    if (row.isBundle && row.bundleItems?.length) {
      j.bundleItems = row.bundleItems.map((b) => ({
        id: b.id,
        qtyPerBundle: b.qtyPerBundle,
        componentProductId: b.componentProductId,
        componentProduct: b.componentProduct,
        componentStock: compStocks[String(b.componentProductId)] ?? 0,
      }));
    }
    return res.json(j);
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const name = req.body?.name?.trim();
    if (!name) {
      await t.rollback();
      return res.status(400).json({ error: 'Nombre requerido' });
    }
    const sku = req.body?.sku?.trim() || null;

    const isBundle = req.body?.isBundle === true || req.body?.isBundle === 'true';
    const tracksStock = isBundle ? false : normalizeTracksStock(req.body?.tracksStock);

    let supplierId = req.body?.supplierId ? String(req.body.supplierId).trim() : null;
    if (!supplierId) {
      supplierId = await getDefaultSupplierId({ transaction: t });
    } else {
      const sup = await db.Supplier.findByPk(supplierId, { transaction: t });
      if (!sup) {
        await t.rollback();
        return res.status(400).json({ error: 'Proveedor inválido' });
      }
    }

    const unitCost = req.body?.unitCost !== undefined ? Number(req.body.unitCost) : 0;
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Precio unitario compra inválido' });
    }

    let initialQty = Math.max(0, Math.trunc(Number(req.body?.initialQty ?? 0)));
    if (!Number.isFinite(initialQty) || initialQty < 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Cantidad inicial inválida' });
    }
    if (!tracksStock && initialQty > 0) {
      await t.rollback();
      return res.status(400).json({
        error: isBundle ? 'Los packs no llevan stock propio: el stock es el de cada producto del pack' : 'Los tragos no llevan stock inicial',
      });
    }

    let happyFields;
    if (isBundle) {
      happyFields = {
        happyHourEnabled: false,
        happyHourMode: HAPPY_HOUR_MODES.OFF,
        happyHourUnitPrice: null,
      };
    } else {
      try {
        happyFields = coerceHappyHourPayload(req.body, { tracksStock, prev: {} });
      } catch (hhErr) {
        await t.rollback();
        return res.status(hhErr.statusCode || 400).json({ error: hhErr.message });
      }
    }

    const row = await Product.create(
      {
        supplierId,
        categoryId: req.body?.categoryId || null,
        name,
        sku,
        unitCost: unitCost.toFixed(2),
        salePrice: req.body?.salePrice ?? 0,
        tracksStock,
        isBundle,
        ...happyFields,
        reorderLevel: tracksStock ? req.body?.reorderLevel ?? 5 : 0,
        active: req.body?.active !== false,
      },
      { transaction: t }
    );

    if (isBundle) {
      const rawItems = Array.isArray(req.body?.bundleItems) ? req.body.bundleItems : [];
      if (!rawItems.length) {
        await t.rollback();
        return res.status(400).json({ error: 'Un pack debe incluir al menos un producto del catálogo' });
      }
      const seen = new Set();
      for (const item of rawItems) {
        const compId = item.componentProductId || item.productId;
        if (!compId || seen.has(String(compId))) {
          await t.rollback();
          return res.status(400).json({ error: 'Ítems del pack inválidos o duplicados' });
        }
        seen.add(String(compId));
        const per = Math.max(1, Math.trunc(Number(item.qtyPerBundle ?? item.qty ?? 1)));
        if (!Number.isFinite(per) || per < 1) {
          await t.rollback();
          return res.status(400).json({ error: 'Cantidad por pack inválida' });
        }
        const comp = await db.Product.findByPk(compId, { transaction: t });
        if (!comp || !comp.active) {
          await t.rollback();
          return res.status(400).json({ error: 'Producto del catálogo no encontrado o inactivo' });
        }
        if (comp.tracksStock === false || comp.isBundle) {
          await t.rollback();
          return res.status(400).json({
            error: `«${comp.name}» no puede formar parte del pack (debe ser mercadería con stock, no otro pack ni trago)`,
          });
        }
        await db.ProductBundleItem.create(
          {
            bundleProductId: row.id,
            componentProductId: comp.id,
            qtyPerBundle: per,
          },
          { transaction: t }
        );
      }
    }

    if (tracksStock && initialQty > 0) {
      await db.StockMovement.create(
        {
          productId: row.id,
          userId: req.user.id,
          movementType: inventory.MOVEMENT_TYPES.ADJUSTMENT,
          qtyDelta: initialQty,
          purchaseLineId: null,
          saleLineId: null,
          note: 'Stock inicial alta producto',
        },
        { transaction: t }
      );
    }

    await t.commit();

    const full = await Product.findByPk(row.id, {
      include: [
        { model: db.Category, as: 'category', attributes: ['id', 'name'], required: false },
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
        {
          model: db.ProductBundleItem,
          as: 'bundleItems',
          required: false,
          include: [{ model: db.Product, as: 'componentProduct', attributes: ['id', 'name', 'sku'], required: false }],
        },
      ],
    });
    const stock = await inventory.getStock(full.id);
    const j = formatProduct(full, stock);
    if (full.isBundle && full.bundleItems?.length) {
      const cids = full.bundleItems.map((b) => b.componentProductId).filter(Boolean);
      const cs = cids.length ? await inventory.getStockMap([...new Set(cids)]) : {};
      j.bundleItems = full.bundleItems.map((b) => ({
        id: b.id,
        qtyPerBundle: b.qtyPerBundle,
        componentProductId: b.componentProductId,
        componentProduct: b.componentProduct,
        componentStock: cs[String(b.componentProductId)] ?? 0,
      }));
    }
    return res.status(201).json(j);
  } catch (e) {
    await t.rollback();
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'SKU ya en uso' });
    }
    return next(e);
  }
}

async function syncBundleItemsTx(bundleProductId, rawItems, transaction) {
  const arr = Array.isArray(rawItems) ? rawItems : [];
  if (!arr.length) {
    const err = new Error('Un pack debe incluir al menos un producto del catálogo');
    err.statusCode = 400;
    throw err;
  }
  await db.ProductBundleItem.destroy({ where: { bundleProductId }, transaction });
  const seen = new Set();
  for (const item of arr) {
    const compId = item.componentProductId || item.productId;
    if (!compId || seen.has(String(compId))) {
      const err = new Error('Ítems del pack inválidos o duplicados');
      err.statusCode = 400;
      throw err;
    }
    seen.add(String(compId));
    const per = Math.max(1, Math.trunc(Number(item.qtyPerBundle ?? item.qty ?? 1)));
    if (!Number.isFinite(per) || per < 1) {
      const err = new Error('Cantidad por pack inválida');
      err.statusCode = 400;
      throw err;
    }
    const comp = await db.Product.findByPk(compId, { transaction });
    if (!comp || !comp.active) {
      const err = new Error('Producto del catálogo no encontrado o inactivo');
      err.statusCode = 400;
      throw err;
    }
    if (comp.tracksStock === false || comp.isBundle) {
      const err = new Error(
        `«${comp.name}» no puede formar parte del pack (debe ser mercadería con stock, no otro pack ni trago)`
      );
      err.statusCode = 400;
      throw err;
    }
    await db.ProductBundleItem.create(
      { bundleProductId, componentProductId: comp.id, qtyPerBundle: per },
      { transaction }
    );
  }
}

async function update(req, res, next) {
  try {
    const row = await Product.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });

    if (row.isBundle && req.body.tracksStock !== undefined) {
      return res.status(400).json({ error: 'Un pack no puede pasar a seguimiento de stock por SKU' });
    }

    if (req.body.tracksStock !== undefined) {
      const want = normalizeTracksStock(req.body.tracksStock);
      const currentTs = row.tracksStock !== false;
      if (want && !currentTs) {
        return res.status(400).json({ error: 'No se puede convertir un trago BAR en producto con stock desde acá.' });
      }
      if (!want && currentTs) {
        const st = await inventory.getStock(row.id);
        if (st !== 0) {
          return res.status(400).json({ error: 'No pasar a trago BAR: hay stock distinto de cero' });
        }
        row.reorderLevel = 0;
      }
      row.tracksStock = want;
    }

    if (req.body.isBundle === true || req.body.isBundle === 'true') {
      return res.status(400).json({ error: 'No se puede convertir un producto en pack desde esta pantalla' });
    }

    if (req.body.supplierId !== undefined) {
      const sid = req.body.supplierId ? String(req.body.supplierId).trim() : null;
      if (!sid) return res.status(400).json({ error: 'Proveedor requerido' });
      const sup = await db.Supplier.findByPk(sid);
      if (!sup) return res.status(400).json({ error: 'Proveedor inválido' });
      row.supplierId = sid;
    }
    if (req.body.unitCost !== undefined) {
      const uc = Number(req.body.unitCost);
      if (!Number.isFinite(uc) || uc < 0) return res.status(400).json({ error: 'Precio unitario compra inválido' });
      row.unitCost = uc.toFixed(2);
    }
    if (req.body.categoryId !== undefined) row.categoryId = req.body.categoryId || null;
    if (req.body.name !== undefined) row.name = String(req.body.name).trim() || row.name;
    if (req.body.sku !== undefined) row.sku = req.body.sku?.trim() || null;
    if (req.body.salePrice !== undefined) row.salePrice = req.body.salePrice;
    if (req.body.reorderLevel !== undefined) row.reorderLevel = req.body.reorderLevel;
    if (req.body.active !== undefined) row.active = !!req.body.active;

    if (
      !row.isBundle &&
      (req.body.happyHourEnabled !== undefined ||
        req.body.happyHourMode !== undefined ||
        req.body.happyHourUnitPrice !== undefined)
    ) {
      try {
        const hh = coerceHappyHourPayload(req.body, {
          tracksStock: row.tracksStock !== false ? true : false,
          prev: row,
        });
        row.happyHourEnabled = hh.happyHourEnabled;
        row.happyHourMode = hh.happyHourMode;
        row.happyHourUnitPrice = hh.happyHourUnitPrice;
      } catch (hhErr) {
        return res.status(hhErr.statusCode || 400).json({ error: hhErr.message });
      }
    }

    if (row.isBundle && req.body.bundleItems !== undefined) {
      const t = await db.sequelize.transaction();
      try {
        await syncBundleItemsTx(row.id, req.body.bundleItems, t);
        await t.commit();
      } catch (e2) {
        await t.rollback();
        const code = e2.statusCode || 500;
        if (code >= 400 && code < 500) return res.status(code).json({ error: e2.message });
        throw e2;
      }
    }

    await row.save();

    const full = await Product.findByPk(row.id, {
      include: [
        { model: db.Category, as: 'category', attributes: ['id', 'name'], required: false },
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
        {
          model: db.ProductBundleItem,
          as: 'bundleItems',
          required: false,
          include: [{ model: db.Product, as: 'componentProduct', attributes: ['id', 'name', 'sku'], required: false }],
        },
      ],
    });
    const stock = await inventory.getStock(row.id);
    const extraComp = (full.bundleItems || []).map((b) => b.componentProductId).filter(Boolean);
    const compStocks = extraComp.length ? await inventory.getStockMap([...new Set(extraComp)]) : {};
    const j = formatProduct(full, stock);
    if (full.isBundle && full.bundleItems?.length) {
      j.bundleItems = full.bundleItems.map((b) => ({
        id: b.id,
        qtyPerBundle: b.qtyPerBundle,
        componentProductId: b.componentProductId,
        componentProduct: b.componentProduct,
        componentStock: compStocks[String(b.componentProductId)] ?? 0,
      }));
    }
    return res.json(j);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'SKU ya en uso' });
    }
    return next(e);
  }
}

async function remove(req, res, next) {
  try {
    const row = await Product.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    if (row.tracksStock !== false) {
      const st = await inventory.getStock(row.id);
      if (st !== 0) return res.status(400).json({ error: 'No se puede eliminar: hay stock distinto de cero' });
    }
    row.active = false;
    await row.save();
    return res.json({ ok: true, id: row.id, active: row.active });
  } catch (e) {
    return next(e);
  }
}

async function adjust(req, res, next) {
  try {
    const note = req.body?.note?.trim() || null;
    const qtyDelta = req.body?.qtyDelta;
    const stock = await inventory.adjustStock(req.user.id, req.params.id, qtyDelta, note);
    return res.json({ productId: req.params.id, stock });
  } catch (e) {
    const code = e.statusCode || 500;
    if (code >= 400 && code < 500) return res.status(code).json({ error: e.message });
    return next(e);
  }
}

module.exports = { list, get, create, update, remove, adjust };
