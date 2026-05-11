'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'is_bundle', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addIndex('products', ['is_bundle'], { name: 'products_is_bundle_idx' });

    await queryInterface.createTable('product_bundle_items', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      bundle_product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      component_product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      qty_per_bundle: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
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
    await queryInterface.addIndex('product_bundle_items', ['bundle_product_id', 'component_product_id'], {
      unique: true,
      name: 'product_bundle_items_bundle_component_unique',
    });
    await queryInterface.addIndex('product_bundle_items', ['bundle_product_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_bundle_items');
    await queryInterface.removeIndex('products', 'products_is_bundle_idx');
    await queryInterface.removeColumn('products', 'is_bundle');
  },
};
