"use strict";
module.exports = (sequelize, DataTypes) => {
  const Cafe = sequelize.define(
    "Cafe",
    {
      cafeId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      qrPayment: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      qrBackground: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      xposition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 50,
      },
      yposition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 50,
      },
      scale: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "User",
          key: "userId",
        },
      },
      needsConfirmation: {
        // New field for confirmation status
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // Default to false (not needing confirmation)
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "Cafe",
      freezeTableName: true,
    }
  );

  Cafe.associate = function (models) {
    Cafe.belongsTo(models.User, { foreignKey: "ownerId" });
    Cafe.hasMany(models.Item, { foreignKey: "cafeId" });
    Cafe.hasMany(models.User, { foreignKey: "cafeId" });
    Cafe.hasMany(models.ItemType, { foreignKey: "cafeId" });
  };

  return Cafe;
};
