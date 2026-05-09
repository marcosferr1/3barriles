'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false },
    },
    { tableName: 'users' }
  );

  User.associate = (models) => {
    User.hasMany(models.PurchaseOrder, { foreignKey: 'createdBy', as: 'purchaseOrders' });
    User.hasMany(models.Sale, { foreignKey: 'createdBy', as: 'sales' });
    User.hasMany(models.StockMovement, { foreignKey: 'userId', as: 'stockMovements' });
  };

  return User;
};
