"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the DailyReport table
    await queryInterface.dropTable("DailyReport");
  },

  down: async (queryInterface, Sequelize) => {
    // Re-create the DailyReport table in case the migration is rolled back
    await queryInterface.createTable("DailyReport", {
      dailyReportId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      reportDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      cafeId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "Cafe",
          key: "cafeId",
        },
      },
      favoriteItemId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Item",
          key: "itemId",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      totalIncome: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      transactionCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      materialMutationIds: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      otherFavorites: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },
};
