'use strict';

module.exports = (sequelize, DataTypes) => {
  const Sale = sequelize.define(
    'Sale',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      paymentMethod: { type: DataTypes.STRING, allowNull: false },
      totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      soldAt: { type: DataTypes.DATE, allowNull: false },
      createdBy: { type: DataTypes.UUID, allowNull: false },
    },
    { tableName: 'sales' }
  );

  Sale.associate = (models) => {
    Sale.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Sale.hasMany(models.SaleLine, { foreignKey: 'saleId', as: 'lines' });
  };

  return Sale;
};
