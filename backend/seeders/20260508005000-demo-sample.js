'use strict';

const { Op } = require('sequelize');

const CATEGORY_VINOS = 'a1000001-1000-4000-8000-000000000001';
const CATEGORY_INSUMOS = 'a1000001-1000-4000-8000-000000000002';
const SUP_DIST = 'b2000002-2000-4000-8000-000000000001';
const PROD1 = 'c3000003-3000-4000-8000-000000000001';
const PROD2 = 'c3000003-3000-4000-8000-000000000002';
const PROD3 = 'c3000003-3000-4000-8000-000000000003';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const noop = { ignoreDuplicates: true };

    await queryInterface.bulkInsert(
      'categories',
      [
        { id: CATEGORY_VINOS, name: 'Vinos', created_at: now, updated_at: now },
        { id: CATEGORY_INSUMOS, name: 'Insumos / bar', created_at: now, updated_at: now },
      ],
      noop
    );

    await queryInterface.bulkInsert(
      'suppliers',
      [
        {
          id: SUP_DIST,
          name: 'Distribuidora demo',
          phone: null,
          email: null,
          notes: 'Datos de ejemplo',
          created_at: now,
          updated_at: now,
        },
      ],
      noop
    );

    await queryInterface.bulkInsert(
      'products',
      [
        {
          id: PROD1,
          supplier_id: SUP_DIST,
          category_id: CATEGORY_VINOS,
          unit_cost: 4200,
          name: 'Malbec reserva (ejemplo)',
          sku: 'VIN-MAL-001',
          sale_price: 8500,
          reorder_level: 6,
          active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: PROD2,
          supplier_id: SUP_DIST,
          category_id: CATEGORY_VINOS,
          unit_cost: 3800,
          name: 'Cabernet (ejemplo)',
          sku: 'VIN-CAB-002',
          sale_price: 7200,
          reorder_level: 4,
          active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: PROD3,
          supplier_id: SUP_DIST,
          category_id: CATEGORY_INSUMOS,
          unit_cost: 6200,
          name: 'Vaso pack x6',
          sku: 'BAR-VASO-003',
          sale_price: 12000,
          reorder_level: 3,
          active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      noop
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('products', { id: { [Op.in]: [PROD1, PROD2, PROD3] } });
    await queryInterface.bulkDelete('suppliers', { id: { [Op.in]: [SUP_DIST] } });
    await queryInterface.bulkDelete('categories', { id: { [Op.in]: [CATEGORY_VINOS, CATEGORY_INSUMOS] } });
  },
};
