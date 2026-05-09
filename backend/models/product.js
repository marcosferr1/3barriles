'use strict';

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      supplierId: { type: DataTypes.UUID, allowNull: false },
      categoryId: { type: DataTypes.UUID, allowNull: true },
      unitCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      name: { type: DataTypes.STRING, allowNull: false },
      sku: { type: DataTypes.STRING, allowNull: true, unique: true },
      salePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tracksStock: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      happyHourEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      happyHourMode: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'OFF' },
      happyHourUnitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      reorderLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'products' }
  );

  Product.associate = (models) => {
    Product.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
    Product.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
    Product.hasMany(models.PurchaseOrderLine, { foreignKey: 'productId', as: 'purchaseOrderLines' });
    Product.hasMany(models.SaleLine, { foreignKey: 'productId', as: 'saleLines' });
    Product.hasMany(models.StockMovement, { foreignKey: 'productId', as: 'stockMovements' });
  };

  return Product;
};
