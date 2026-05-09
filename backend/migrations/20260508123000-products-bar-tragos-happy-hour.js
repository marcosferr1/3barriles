'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'tracks_stock', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('products', 'happy_hour_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('products', 'happy_hour_mode', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'OFF',
    });
    await queryInterface.addColumn('products', 'happy_hour_unit_price', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'happy_hour_unit_price');
    await queryInterface.removeColumn('products', 'happy_hour_mode');
    await queryInterface.removeColumn('products', 'happy_hour_enabled');
    await queryInterface.removeColumn('products', 'tracks_stock');
  },
};
