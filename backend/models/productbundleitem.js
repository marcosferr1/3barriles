'use strict';

module.exports = (sequelize, DataTypes) => {
  const ProductBundleItem = sequelize.define(
    'ProductBundleItem',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      bundleProductId: { type: DataTypes.UUID, allowNull: false },
      componentProductId: { type: DataTypes.UUID, allowNull: false },
      qtyPerBundle: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'product_bundle_items' }
  );

  ProductBundleItem.associate = (models) => {
    ProductBundleItem.belongsTo(models.Product, { foreignKey: 'bundleProductId', as: 'bundleProduct' });
    ProductBundleItem.belongsTo(models.Product, { foreignKey: 'componentProductId', as: 'componentProduct' });
  };

  return ProductBundleItem;
};
