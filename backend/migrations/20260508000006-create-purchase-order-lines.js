'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchase_order_lines', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      purchase_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'purchase_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      qty: { type: Sequelize.INTEGER, allowNull: false },
      unit_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('purchase_order_lines', ['purchase_order_id']);
    await queryInterface.addIndex('purchase_order_lines', ['product_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('purchase_order_lines');
  },
};
