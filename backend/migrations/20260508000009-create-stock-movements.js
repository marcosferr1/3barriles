'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_movements', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      movement_type: { type: Sequelize.STRING, allowNull: false },
      qty_delta: { type: Sequelize.INTEGER, allowNull: false },
      purchase_line_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'purchase_order_lines', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sale_line_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'sale_lines', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      note: { type: Sequelize.TEXT, allowNull: true },
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
    await queryInterface.addIndex('stock_movements', ['product_id']);
    await queryInterface.addIndex('stock_movements', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_movements');
  },
};
