"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("DailyReport", "favoriteItemId", {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow NULL values
      references: {
        model: "Item",
        key: "itemId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("DailyReport", "favoriteItemId", {
      type: Sequelize.INTEGER,
      allowNull: false, // Revert to NOT NULL if needed
      references: {
        model: "Item",
        key: "itemId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },
};
