const { Transaction } = require('sequelize');
const db = require('../../models');
const { HAPPY_HOUR_MODES } = require('../constants/happyHour');

const MOVEMENT_TYPES = {
  PURCHASE_IN: 'PURCHASE_IN',
  SALE_OUT: 'SALE_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
};

const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'CARD'];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getStockMap(productIds, { transaction } = {}) {
  if (!productIds.length) return {};
  const rows = await db.sequelize.query(
    `
    SELECT product_id AS "productId",
           COALESCE(SUM(qty_delta), 0)::int AS stock
    FROM stock_movements
    WHERE product_id IN (:ids)
    GROUP BY product_id
  `,
    { replacements: { ids: productIds }, type: db.sequelize.QueryTypes.SELECT, transaction }
  );
  /** @type {Record<string, number>} */
  const map = {};
  for (const r of rows) {
    map[String(r.productId)] = Number(r.stock || 0);
  }
  for (const id of productIds) {
    if (map[String(id)] === undefined) map[String(id)] = 0;
  }
  return map;
}

async function getStock(productId, { transaction } = {}) {
  const [row] = await db.sequelize.query(
    `
    SELECT COALESCE(SUM(qty_delta), 0)::int AS stock
    FROM stock_movements
    WHERE product_id = :pid
  `,
    { replacements: { pid: productId }, type: db.sequelize.QueryTypes.SELECT, transaction }
  );
  return Number(row?.stock || 0);
}

/**
 * @param {{ supplierId: string, orderedAt?: string, lines: Array<{ productId: string, qty: number, unitCost: number}> }} input
 */
async function createDraftPurchase(userId, input) {
  const { supplierId, orderedAt, lines } = input;
  if (!lines?.length) {
    const err = new Error('La compra debe tener al menos una línea');
    err.statusCode = 400;
    throw err;
  }
  const t = await db.sequelize.transaction();
  try {
    const po = await db.PurchaseOrder.create(
      {
        supplierId,
        orderedAt: orderedAt || new Date().toISOString().slice(0, 10),
        status: 'DRAFT',
        createdBy: userId,
      },
      { transaction: t }
    );
    for (const ln of lines) {
      if (!ln.productId || !ln.qty || ln.qty < 1) {
        const err = new Error('Línea inválida (producto y cantidad > 0)');
        err.statusCode = 400;
        throw err;
      }
      const product = await db.Product.findByPk(ln.productId, { transaction: t });
      if (!product) {
        const err = new Error(`Producto no encontrado: ${ln.productId}`);
        err.statusCode = 400;
        throw err;
      }
      if (product.tracksStock === false) {
        const err = new Error(
          `Las compras no pueden incluir tragos/servicios («${product.name}»)` 
        );
        err.statusCode = 400;
        throw err;
      }
      if (String(product.supplierId) !== String(supplierId)) {
        const err = new Error(
          `El producto "${product.name}" no pertenece al proveedor elegido en la orden`
        );
        err.statusCode = 400;
        throw err;
      }
      const uc = toNum(ln.unitCost);
      if (uc < 0) {
        const err = new Error('Costo unitario inválido');
        err.statusCode = 400;
        throw err;
      }
      await db.PurchaseOrderLine.create(
        {
          purchaseOrderId: po.id,
          productId: ln.productId,
          qty: Math.floor(ln.qty),
          unitCost: uc,
        },
        { transaction: t }
      );
    }
    await t.commit();
    return po.id;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function receivePurchaseOrder(purchaseOrderId, userId) {
  const t = await db.sequelize.transaction();
  try {
    const po = await db.PurchaseOrder.findByPk(purchaseOrderId, {
      transaction: t,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!po) {
      const err = new Error('Compra no encontrada');
      err.statusCode = 404;
      throw err;
    }
    if (po.status !== 'DRAFT') {
      const err = new Error('Solo se puede recibir una compra en borrador');
      err.statusCode = 400;
      throw err;
    }
    const lineRows = await db.PurchaseOrderLine.findAll({
      where: { purchaseOrderId: po.id },
      transaction: t,
    });
    if (!lineRows.length) {
      const err = new Error('La orden no tiene líneas');
      err.statusCode = 400;
      throw err;
    }

    for (const line of lineRows) {
      await db.StockMovement.create(
        {
          productId: line.productId,
          userId,
          movementType: MOVEMENT_TYPES.PURCHASE_IN,
          qtyDelta: line.qty,
          purchaseLineId: line.id,
          saleLineId: null,
          note: null,
        },
        { transaction: t }
      );

      const uc = toNum(line.unitCost);
      const product = await db.Product.findByPk(line.productId, {
        transaction: t,
        lock: Transaction.LOCK.UPDATE,
      });
      if (product) {
        product.unitCost = uc.toFixed(2);
        await product.save({ transaction: t });
      }
    }

    po.status = 'RECEIVED';
    po.receivedAt = new Date();
    await po.save({ transaction: t });
    await t.commit();
    return po;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

/**
 * @param {{ paymentMethod: string, lines: Array<{ productId: string, qty: number}> }} input
 */
/**
 * @param {import('sequelize').Model & { tracksStock?: boolean }} product
 * @param {{ qty: number; happyHour?: boolean }} ln
 */
function resolveSaleLine(product, ln) {
  const userQty = Math.floor(Number(ln.qty));
  if (product.isBundle) {
    const salePrice = toNum(product.salePrice);
    return {
      productId: product.id,
      qty: userQty,
      unitPrice: salePrice,
      happyHourApplied: false,
      lineDescription: `${product.name} (pack)`,
    };
  }
  const tracksStock = product.tracksStock !== false;
  const salePrice = toNum(product.salePrice);
  let effQty = userQty;
  let unitPrice = salePrice;
  let happyHourApplied = false;
  let lineDescription = product.name;

  if (!tracksStock) {
    const wantHh = !!ln.happyHour;
    const canApplyHh =
      wantHh &&
      product.happyHourEnabled &&
      product.happyHourMode &&
      product.happyHourMode !== HAPPY_HOUR_MODES.OFF;
    if (canApplyHh) {
      const mode = product.happyHourMode;
      happyHourApplied = true;
      lineDescription = `${product.name} (happy hour)`;
      switch (mode) {
        case HAPPY_HOUR_MODES.SPECIAL_PRICE: {
          const hp = toNum(product.happyHourUnitPrice);
          if (!(Number.isFinite(hp) && hp >= 0)) {
            const err = new Error(
              `"${product.name}": modo happy hour con precio especial — falta o es inválido el precio happy hour`
            );
            err.statusCode = 400;
            throw err;
          }
          effQty = userQty;
          unitPrice = hp;
          break;
        }
        case HAPPY_HOUR_MODES.DOUBLE_QTY:
          effQty = userQty * 2;
          unitPrice = salePrice;
          break;
        case HAPPY_HOUR_MODES.PROMO_2FOR1:
          effQty = userQty * 2;
          unitPrice = salePrice / 2;
          break;
        default:
          happyHourApplied = false;
          lineDescription = product.name;
          effQty = userQty;
          unitPrice = salePrice;
          break;
      }
    }
  }

  return { productId: product.id, qty: effQty, unitPrice, happyHourApplied, lineDescription };
}

/**
 * Valida líneas, agrega necesidades de stock (incluye componentes de packs) y devuelve total + filas listas para persistir.
 * @param {import('sequelize').Transaction} transaction
 * @param {Array<{ productId: string, qty: number, happyHour?: boolean}>} lines
 */
async function prepareSaleLines(transaction, lines) {
  /** @type {Record<string, number>} */
  const stockNeed = {};
  /** @type {Record<string, string>} */
  const stockLabel = {};
  /** @type {Array<{ product: import('sequelize').Model; row: ReturnType<typeof resolveSaleLine>; bundleItems: import('sequelize').Model[] | null }>} */
  const prepared = [];
  let total = 0;

  for (const ln of lines) {
    const userQty = Math.floor(Number(ln.qty));
    if (!ln.productId || userQty < 1) {
      const err = new Error('Línea inválida');
      err.statusCode = 400;
      throw err;
    }
    // Solo bloquear la fila de products: no incluir bundleItems aquí (LEFT JOIN + FOR UPDATE falla en PostgreSQL).
    const product = await db.Product.findByPk(ln.productId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!product || !product.active) {
      const err = new Error(`Producto no disponible: ${ln.productId}`);
      err.statusCode = 400;
      throw err;
    }

    let bundleItems = null;
    if (product.isBundle) {
      bundleItems = await db.ProductBundleItem.findAll({
        where: { bundleProductId: product.id },
        transaction,
      });
    }

    const row = resolveSaleLine(product, ln);
    if (!Number.isFinite(row.unitPrice) || row.unitPrice < 0) {
      const err = new Error(`Precio de venta inválido para "${product.name}"`);
      err.statusCode = 400;
      throw err;
    }

    if (product.isBundle) {
      const bis = bundleItems || [];
      if (!bis.length) {
        const err = new Error(`El pack "${product.name}" no tiene productos configurados`);
        err.statusCode = 400;
        throw err;
      }
      for (const bi of bis) {
        const comp = await db.Product.findByPk(bi.componentProductId, {
          transaction,
          lock: Transaction.LOCK.UPDATE,
        });
        if (!comp || !comp.active) {
          const err = new Error(`Componente del pack no disponible (${bi.componentProductId})`);
          err.statusCode = 400;
          throw err;
        }
        if (comp.tracksStock === false || comp.isBundle) {
          const err = new Error(
            `El pack "${product.name}" incluye un ítem inválido («${comp.name}»: debe ser mercadería con stock, no otro pack ni trago)`
          );
          err.statusCode = 400;
          throw err;
        }
        const per = Math.max(1, Math.floor(Number(bi.qtyPerBundle)));
        const needAdd = row.qty * per;
        const cid = String(comp.id);
        stockNeed[cid] = (stockNeed[cid] || 0) + needAdd;
        stockLabel[cid] = comp.name;
      }
    } else if (product.tracksStock !== false) {
      const cid = String(product.id);
      stockNeed[cid] = (stockNeed[cid] || 0) + row.qty;
      stockLabel[cid] = product.name;
    }

    total += row.qty * row.unitPrice;
    prepared.push({ product, row, bundleItems });
  }

  const stockIds = Object.keys(stockNeed);
  const stocks = await getStockMap(stockIds, { transaction });
  for (const [pid, need] of Object.entries(stockNeed)) {
    const avail = stocks[pid] ?? 0;
    if (avail < need) {
      const err = new Error(
        `Stock insuficiente para "${stockLabel[pid] || pid}" (${avail} disponibles; se requieren ${need})`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  return { total, prepared };
}

/**
 * @param {import('sequelize').Transaction} transaction
 * @param {string} userId
 * @param {string} saleId
 * @param {Array<{ product: import('sequelize').Model; row: ReturnType<typeof resolveSaleLine>; bundleItems: import('sequelize').Model[] | null }>} prepared
 */
async function insertSaleLinesAndMovements(transaction, userId, saleId, prepared) {
  for (const { product, row, bundleItems } of prepared) {
    const sl = await db.SaleLine.create(
      {
        saleId,
        productId: row.productId,
        qty: row.qty,
        unitPrice: row.unitPrice.toFixed(2),
        happyHourApplied: row.happyHourApplied,
        lineDescription: row.lineDescription,
      },
      { transaction }
    );
    if (product.isBundle) {
      const bis = bundleItems?.length
        ? bundleItems
        : await db.ProductBundleItem.findAll({
            where: { bundleProductId: product.id },
            transaction,
          });
      for (const bi of bis) {
        const per = Math.max(1, Math.floor(Number(bi.qtyPerBundle)));
        const delta = row.qty * per;
        await db.StockMovement.create(
          {
            productId: bi.componentProductId,
            userId,
            movementType: MOVEMENT_TYPES.SALE_OUT,
            qtyDelta: -delta,
            purchaseLineId: null,
            saleLineId: sl.id,
            note: null,
          },
          { transaction }
        );
      }
    } else if (product.tracksStock !== false) {
      await db.StockMovement.create(
        {
          productId: row.productId,
          userId,
          movementType: MOVEMENT_TYPES.SALE_OUT,
          qtyDelta: -row.qty,
          purchaseLineId: null,
          saleLineId: sl.id,
          note: null,
        },
        { transaction }
      );
    }
  }
}

/**
 * @param {{ paymentMethod: string, lines: Array<{ productId: string, qty: number, happyHour?: boolean}> }} input
 */
async function createSale(userId, input) {
  const { paymentMethod, lines } = input;
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    const err = new Error('Medio de pago inválido');
    err.statusCode = 400;
    throw err;
  }
  if (!lines?.length) {
    const err = new Error('La venta debe tener al menos una línea');
    err.statusCode = 400;
    throw err;
  }

  const t = await db.sequelize.transaction();
  try {
    const { total, prepared } = await prepareSaleLines(t, lines);

    const sale = await db.Sale.create(
      {
        paymentMethod,
        totalAmount: total.toFixed(2),
        soldAt: new Date(),
        createdBy: userId,
      },
      { transaction: t }
    );

    await insertSaleLinesAndMovements(t, userId, sale.id, prepared);

    await t.commit();
    return sale.id;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

/**
 * @param {string} saleId
 * @param {string} userId
 * @param {{ paymentMethod: string, lines: Array<{ productId: string, qty: number, happyHour?: boolean}> }} input
 */
async function updateSale(saleId, userId, input) {
  const { paymentMethod, lines } = input;
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    const err = new Error('Medio de pago inválido');
    err.statusCode = 400;
    throw err;
  }
  if (!lines?.length) {
    const err = new Error('La venta debe tener al menos una línea');
    err.statusCode = 400;
    throw err;
  }

  const t = await db.sequelize.transaction();
  try {
    const sale = await db.Sale.findByPk(saleId, { transaction: t, lock: Transaction.LOCK.UPDATE });
    if (!sale) {
      const err = new Error('Venta no encontrada');
      err.statusCode = 404;
      throw err;
    }

    const oldLines = await db.SaleLine.findAll({
      where: { saleId },
      attributes: ['id'],
      transaction: t,
    });
    const oldIds = oldLines.map((r) => r.id);
    if (oldIds.length) {
      await db.StockMovement.destroy({ where: { saleLineId: oldIds }, transaction: t });
    }
    await db.SaleLine.destroy({ where: { saleId }, transaction: t });

    const { total, prepared } = await prepareSaleLines(t, lines);

    sale.paymentMethod = paymentMethod;
    sale.totalAmount = total.toFixed(2);
    await sale.save({ transaction: t });

    await insertSaleLinesAndMovements(t, userId, sale.id, prepared);

    await t.commit();
    return sale.id;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function deleteSale(saleId) {
  const t = await db.sequelize.transaction();
  try {
    const sale = await db.Sale.findByPk(saleId, { transaction: t, lock: Transaction.LOCK.UPDATE });
    if (!sale) {
      const err = new Error('Venta no encontrada');
      err.statusCode = 404;
      throw err;
    }
    const oldLines = await db.SaleLine.findAll({
      where: { saleId },
      attributes: ['id'],
      transaction: t,
    });
    const oldIds = oldLines.map((r) => r.id);
    if (oldIds.length) {
      await db.StockMovement.destroy({ where: { saleLineId: oldIds }, transaction: t });
    }
    await db.SaleLine.destroy({ where: { saleId }, transaction: t });
    await sale.destroy({ transaction: t });
    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function adjustStock(userId, productId, qtyDelta, note) {
  const delta = Math.trunc(Number(qtyDelta));
  if (!Number.isFinite(delta) || delta === 0) {
    const err = new Error('Ajuste inválido');
    err.statusCode = 400;
    throw err;
  }
  const t = await db.sequelize.transaction();
  try {
    const product = await db.Product.findByPk(productId, { transaction: t, lock: Transaction.LOCK.UPDATE });
    if (!product) {
      const err = new Error('Producto no encontrado');
      err.statusCode = 404;
      throw err;
    }
    if (product.tracksStock === false) {
      const err = new Error('Los tragos BAR no llevan stock: no aplican ajustes de depósito');
      err.statusCode = 400;
      throw err;
    }
    const after = (await getStock(productId, { transaction: t })) + delta;
    if (after < 0) {
      const err = new Error('El ajuste dejaría stock negativo');
      err.statusCode = 400;
      throw err;
    }
    await db.StockMovement.create(
      {
        productId,
        userId,
        movementType: MOVEMENT_TYPES.ADJUSTMENT,
        qtyDelta: delta,
        purchaseLineId: null,
        saleLineId: null,
        note: note || null,
      },
      { transaction: t }
    );
    await t.commit();
    return after;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  MOVEMENT_TYPES,
  PAYMENT_METHODS,
  getStock,
  getStockMap,
  createDraftPurchase,
  receivePurchaseOrder,
  createSale,
  updateSale,
  deleteSale,
  adjustStock,
};
