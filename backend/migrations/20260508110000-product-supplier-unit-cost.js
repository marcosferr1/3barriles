'use strict';

const DEFAULT_SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `
      INSERT INTO suppliers (id, name, phone, email, notes, created_at, updated_at)
      VALUES (:id, '3barrilesProv', NULL, NULL, 'Proveedor interno por defecto', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `,
      { replacements: { id: DEFAULT_SUPPLIER_ID } }
    );

    await queryInterface.addColumn('products', 'supplier_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'suppliers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addColumn('products', 'unit_cost', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(`UPDATE products SET supplier_id = :sid WHERE supplier_id IS NULL`, {
      replacements: { sid: DEFAULT_SUPPLIER_ID },
    });

    await queryInterface.changeColumn('products', 'supplier_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'suppliers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('products', ['supplier_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('products', ['supplier_id']);
    await queryInterface.removeColumn('products', 'unit_cost');
    await queryInterface.removeColumn('products', 'supplier_id');
  },
};
