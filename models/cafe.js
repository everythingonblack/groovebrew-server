"use strict";

const { v4: uuidv4 } = require("uuid"); // Use UUID for generating unique identifiers

// Function to generate a 15-character unique ID with dashes every 5 characters
function generateCafeId() {
  const uuid = uuidv4().replace(/-/g, ""); // Remove the dashes from UUID
  return `${uuid.slice(0, 5)}-${uuid.slice(5, 10)}-${uuid.slice(10, 15)}`; // Return formatted string
}

module.exports = (sequelize, DataTypes) => {
  const Cafe = sequelize.define(
    "Cafe",
    {
      cafeId: {
        type: DataTypes.STRING, // Change to STRING
        primaryKey: true,
        allowNull: false,
        unique: true,
        defaultValue: () => generateCafeId(), // Use custom ID generator
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
        defaultValue: "uploads/1736703782722.png",
      },
      xposition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 62.25,
      },
      yposition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 50,
      },
      scale: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 21.50,
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
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      welcomePageConfig: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Asia/Jakarta",
      },
      fontsize: {
        type: DataTypes.DECIMAL(10, 2), // Decimal for precise numeric values
        allowNull: true,
        defaultValue: 31.25, // Default value for fontsize
      },
      fontcolor: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "#FFFFFF", // Default value for fontfamily
      },
      fontxposition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 5.5, // Default value for fontxposition
      },
      fontyposition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 68.0, // Default value for fontyposition
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
