'use strict';

module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define(
    'Supplier',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'suppliers' }
  );

  Supplier.associate = (models) => {
    Supplier.hasMany(models.PurchaseOrder, { foreignKey: 'supplierId', as: 'purchaseOrders' });
    Supplier.hasMany(models.Product, { foreignKey: 'supplierId', as: 'products' });
  };

  return Supplier;
};
