'use strict';

const db = require('../../models');
const { DEFAULT_SUPPLIER_ID, DEFAULT_SUPPLIER_NAME } = require('../constants/defaultSupplier');

/**
 * Id del proveedor interno (migración + seed pueden crear por nombre/id).
 */
async function getDefaultSupplierId({ transaction } = {}) {
  const byId = await db.Supplier.findByPk(DEFAULT_SUPPLIER_ID, { transaction });
  if (byId) return byId.id;
  const byName = await db.Supplier.findOne({ where: { name: DEFAULT_SUPPLIER_NAME }, transaction });
  if (byName) return byName.id;
  throw new Error(
    `Proveedor por defecto "${DEFAULT_SUPPLIER_NAME}" no encontrado. Ejecutá migraciones.`
  );
}

function isDefaultSupplierRow(row) {
  if (!row) return false;
  return row.id === DEFAULT_SUPPLIER_ID || row.name === DEFAULT_SUPPLIER_NAME;
}

module.exports = {
  DEFAULT_SUPPLIER_ID,
  DEFAULT_SUPPLIER_NAME,
  getDefaultSupplierId,
  isDefaultSupplierRow,
};
