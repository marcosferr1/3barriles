'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sale_lines', 'happy_hour_applied', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('sale_lines', 'line_description', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sale_lines', 'line_description');
    await queryInterface.removeColumn('sale_lines', 'happy_hour_applied');
  },
};
