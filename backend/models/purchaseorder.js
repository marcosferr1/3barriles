'use strict';

module.exports = (sequelize, DataTypes) => {
  const PurchaseOrder = sequelize.define(
    'PurchaseOrder',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      supplierId: { type: DataTypes.UUID, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DRAFT' },
      orderedAt: { type: DataTypes.DATEONLY, allowNull: false },
      receivedAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: false },
    },
    { tableName: 'purchase_orders' }
  );

  PurchaseOrder.associate = (models) => {
    PurchaseOrder.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
    PurchaseOrder.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PurchaseOrder.hasMany(models.PurchaseOrderLine, {
      foreignKey: 'purchaseOrderId',
      as: 'lines',
    });
  };

  return PurchaseOrder;
};
