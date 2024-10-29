"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("DailyReport", {
      dailyReportId: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      reportDate: {
        type: Sequelize.DATEONLY, // Use DATEONLY for a date without time
        allowNull: false,
      },
      cafeId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "Cafe",
          key: "cafeId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      favoriteItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Item", // The name of the items table
          key: "itemId",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Adjust based on your needs
      },
      totalIncome: {
        type: Sequelize.DECIMAL(10, 2), // Adjust precision and scale as needed
        allowNull: false,
      },
      transactionCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      materialMutationIds: {
        type: Sequelize.STRING, // Consider if a more structured type is needed
        allowNull: true, // Adjust based on whether this field can be null
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("DailyReport");
  },
};
