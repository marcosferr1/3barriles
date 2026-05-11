'use strict';

const { Op } = require('sequelize');
const db = require('../../models');

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Etiqueta YYYY-MM-DD en hora local del servidor (para defaults y respuesta). */
function fmtYMD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseStartDay(ymd) {
  const m = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(y, mo - 1, da, 0, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d;
}

function parseEndDay(ymd) {
  const m = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(y, mo - 1, da, 23, 59, 59, 999);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d;
}

function defaultRangeBounds() {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function clampInt(raw, def, min, max) {
  let x = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(x)) x = def;
  return Math.min(Math.max(x, min), max);
}

async function summary(req, res, next) {
  try {
    const q = req.query;
    let fromD;
    let toD;
    let fromDay;
    let toDay;

    if (q.from && q.to) {
      fromD = parseStartDay(q.from);
      toD = parseEndDay(q.to);
      fromDay = String(q.from).trim();
      toDay = String(q.to).trim();
      if (!fromD || !toD || fromD > toD) {
        return res.status(400).json({ error: 'Rango de fechas inválido (usá YYYY-MM-DD desde / hasta).' });
      }
    } else if (!q.from && !q.to) {
      const d = defaultRangeBounds();
      fromD = d.from;
      toD = d.to;
      fromDay = fmtYMD(fromD);
      toDay = fmtYMD(toD);
    } else {
      return res.status(400).json({ error: 'Indicá desde y hasta, o ninguno para el período por defecto.' });
    }

    const pLim = clampInt(q.purchaseLimit, 5, 1, 50);
    const sLim = clampInt(q.saleLimit, 5, 1, 50);
    const tLim = clampInt(q.topLimit, 5, 1, 50);
    const kLim = clampInt(q.stockLimit, 5, 1, 50);

    const salesAggRows = await db.sequelize.query(
      `SELECT COALESCE(COUNT(*)::int, 0) AS count, COALESCE(SUM(total_amount), 0) AS total
       FROM sales
       WHERE sold_at >= :fromD AND sold_at <= :toD`,
      { replacements: { fromD, toD }, type: db.sequelize.QueryTypes.SELECT }
    );
    const salesAgg = salesAggRows?.[0] || { count: 0, total: 0 };

    const purchaseCountRows = await db.sequelize.query(
      `SELECT COUNT(*)::int AS c FROM purchase_orders
       WHERE status = 'RECEIVED' AND received_at IS NOT NULL
         AND received_at >= :fromD AND received_at <= :toD`,
      { replacements: { fromD, toD }, type: db.sequelize.QueryTypes.SELECT }
    );
    const purchaseTotal = Number(purchaseCountRows?.[0]?.c ?? 0);

    const saleListCountRows = await db.sequelize.query(
      `SELECT COUNT(*)::int AS c FROM sales
       WHERE sold_at >= :fromD AND sold_at <= :toD`,
      { replacements: { fromD, toD }, type: db.sequelize.QueryTypes.SELECT }
    );
    const saleListTotal = Number(saleListCountRows?.[0]?.c ?? 0);

    const recentPurchases = await db.PurchaseOrder.findAll({
      where: {
        status: 'RECEIVED',
        receivedAt: { [Op.between]: [fromD, toD] },
      },
      order: [['receivedAt', 'DESC']],
      limit: pLim,
      include: [{ model: db.Supplier, as: 'supplier', attributes: ['id', 'name'] }],
    });

    const recentSales = await db.Sale.findAll({
      where: { soldAt: { [Op.between]: [fromD, toD] } },
      order: [['soldAt', 'DESC']],
      limit: sLim,
    });
    const recentSaleIds = recentSales.map((s) => s.id);
    /** @type {Record<string, Array<import('sequelize').Model>>} */
    const linesBySaleId = {};
    if (recentSaleIds.length) {
      const lineRows = await db.SaleLine.findAll({
        where: { saleId: { [Op.in]: recentSaleIds } },
        attributes: ['saleId', 'qty', 'unitPrice', 'lineDescription'],
        include: [{ model: db.Product, as: 'product', attributes: ['id', 'name', 'isBundle'] }],
        order: [['id', 'ASC']],
      });
      for (const ln of lineRows) {
        const sid = String(ln.saleId);
        if (!linesBySaleId[sid]) linesBySaleId[sid] = [];
        linesBySaleId[sid].push(ln);
      }
    }
    const recentSalesPayload = recentSales.map((s) => {
      const j = s.toJSON();
      j.lines = linesBySaleId[String(s.id)] || [];
      return j;
    });

    const topProductsRows = await db.sequelize.query(
      `SELECT p.id, p.name,
          COALESCE(SUM(sl.qty), 0)::int AS qty_sold
       FROM sale_lines sl
       JOIN sales s ON s.id = sl.sale_id
       JOIN products p ON p.id = sl.product_id
       WHERE s.sold_at >= :fromD AND s.sold_at <= :toD
       GROUP BY p.id, p.name
       ORDER BY qty_sold DESC
       LIMIT :lim`,
      { replacements: { fromD, toD, lim: tLim }, type: db.sequelize.QueryTypes.SELECT }
    );

    const topCountRows = await db.sequelize.query(
      `SELECT COUNT(*)::int AS c FROM (
         SELECT p.id
         FROM sale_lines sl
         JOIN sales s ON s.id = sl.sale_id
         JOIN products p ON p.id = sl.product_id
         WHERE s.sold_at >= :fromD AND s.sold_at <= :toD
         GROUP BY p.id
       ) t`,
      { replacements: { fromD, toD }, type: db.sequelize.QueryTypes.SELECT }
    );
    const topProductsTotal = Number(topCountRows?.[0]?.c ?? 0);

    // Solo productos con seguimiento de stock: los tragos BAR (tracks_stock=false)
    // no generan stock_movements y darían siempre stock=0 ≤ reorder_level.
    const lowStockCountRows = await db.sequelize.query(
      `SELECT COUNT(*)::int AS c FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN stock_movements sm ON sm.product_id = p.id
        WHERE p.active = true AND p.tracks_stock = true
        GROUP BY p.id, p.reorder_level
        HAVING COALESCE(SUM(sm.qty_delta), 0) <= p.reorder_level
      ) x`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    const lowStockTotal = Number(lowStockCountRows?.[0]?.c ?? 0);

    const lowStockRows = await db.sequelize.query(
      `
      SELECT p.id,
             p.name,
             p.sku,
             p.reorder_level AS "reorderLevel",
             COALESCE(SUM(sm.qty_delta), 0)::int AS stock
      FROM products p
      LEFT JOIN stock_movements sm ON sm.product_id = p.id
      WHERE p.active = true AND p.tracks_stock = true
      GROUP BY p.id, p.name, p.sku, p.reorder_level
      HAVING COALESCE(SUM(sm.qty_delta), 0) <= p.reorder_level
      ORDER BY stock ASC, p.name ASC
      LIMIT :lim
    `,
      { replacements: { lim: kLim }, type: db.sequelize.QueryTypes.SELECT }
    );

    const lowStock = (lowStockRows || []).map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      stock: Number(r.stock ?? 0),
      reorderLevel: r.reorderLevel,
    }));

    return res.json({
      range: {
        fromDay,
        toDay,
        fromIso: fromD.toISOString(),
        toIso: toD.toISOString(),
      },
      salesInRange: {
        count: Number(salesAgg.count || 0),
        total: String(salesAgg.total ?? '0'),
      },
      recentPurchases,
      recentPurchasesTotal: purchaseTotal,
      recentPurchasesHasMore: purchaseTotal > pLim,
      recentSales: recentSalesPayload,
      recentSalesTotal: saleListTotal,
      recentSalesHasMore: saleListTotal > sLim,
      topProducts: topProductsRows,
      topProductsTotal,
      topProductsHasMore: topProductsTotal > tLim,
      lowStock,
      lowStockTotal,
      lowStockHasMore: lowStockTotal > kLim,
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = { summary };
