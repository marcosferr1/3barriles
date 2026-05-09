'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: { type: Sequelize.STRING, allowNull: false },
      sku: { type: Sequelize.STRING, allowNull: true, unique: true },
      sale_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      reorder_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
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
    await queryInterface.addIndex('products', ['category_id']);
    await queryInterface.addIndex('products', ['name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
