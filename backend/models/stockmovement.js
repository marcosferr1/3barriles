'use strict';

module.exports = (sequelize, DataTypes) => {
  const StockMovement = sequelize.define(
    'StockMovement',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      productId: { type: DataTypes.UUID, allowNull: false },
      userId: { type: DataTypes.UUID, allowNull: false },
      movementType: { type: DataTypes.STRING, allowNull: false },
      qtyDelta: { type: DataTypes.INTEGER, allowNull: false },
      purchaseLineId: { type: DataTypes.UUID, allowNull: true },
      saleLineId: { type: DataTypes.UUID, allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'stock_movements' }
  );

  StockMovement.associate = (models) => {
    StockMovement.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    StockMovement.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    StockMovement.belongsTo(models.PurchaseOrderLine, {
      foreignKey: 'purchaseLineId',
      as: 'purchaseLine',
    });
    StockMovement.belongsTo(models.SaleLine, { foreignKey: 'saleLineId', as: 'saleLine' });
  };

  return StockMovement;
};
