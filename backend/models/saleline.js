'use strict';

module.exports = (sequelize, DataTypes) => {
  const SaleLine = sequelize.define(
    'SaleLine',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      saleId: { type: DataTypes.UUID, allowNull: false },
      productId: { type: DataTypes.UUID, allowNull: false },
      qty: { type: DataTypes.INTEGER, allowNull: false },
      unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      happyHourApplied: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      lineDescription: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'sale_lines' }
  );

  SaleLine.associate = (models) => {
    SaleLine.belongsTo(models.Sale, { foreignKey: 'saleId', as: 'sale' });
    SaleLine.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    SaleLine.hasMany(models.StockMovement, { foreignKey: 'saleLineId', as: 'stockMovements' });
  };

  return SaleLine;
};
