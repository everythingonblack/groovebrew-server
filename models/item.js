const { Sequelize, DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define(
    "Item",
    {
      itemId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cafeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Cafe",
          key: "cafeId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      itemTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "ItemType",
          key: "itemTypeId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: true,
        default: 0,
      },
    },
    {
      tableName: "Item",
      freezeTableName: true,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  Item.associate = function (models) {
    Item.belongsTo(models.Cafe, { foreignKey: "cafeId" });
    Item.belongsTo(models.ItemType, { foreignKey: "itemTypeId" });
  };

  return Item;
};
