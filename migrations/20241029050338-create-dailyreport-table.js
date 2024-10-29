"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
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
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      itemsSold: {
        type: Sequelize.JSON,
        allowNull: false,
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("DailyReport");
  },
};
