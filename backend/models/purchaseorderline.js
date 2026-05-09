'use strict';

module.exports = (sequelize, DataTypes) => {
  const PurchaseOrderLine = sequelize.define(
    'PurchaseOrderLine',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      purchaseOrderId: { type: DataTypes.UUID, allowNull: false },
      productId: { type: DataTypes.UUID, allowNull: false },
      qty: { type: DataTypes.INTEGER, allowNull: false },
      unitCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    },
    { tableName: 'purchase_order_lines' }
  );

  PurchaseOrderLine.associate = (models) => {
    PurchaseOrderLine.belongsTo(models.PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
    PurchaseOrderLine.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    PurchaseOrderLine.hasMany(models.StockMovement, { foreignKey: 'purchaseLineId', as: 'stockMovements' });
  };

  return PurchaseOrderLine;
};
