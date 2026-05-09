'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchase_orders', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      supplier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'DRAFT' },
      ordered_at: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      received_at: { type: Sequelize.DATE, allowNull: true },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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
    await queryInterface.addIndex('purchase_orders', ['supplier_id']);
    await queryInterface.addIndex('purchase_orders', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('purchase_orders');
  },
};
