'use strict';

module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    'Category',
    {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    { tableName: 'categories' }
  );

  Category.associate = (models) => {
    Category.hasMany(models.Product, { foreignKey: 'categoryId', as: 'products' });
  };

  return Category;
};
