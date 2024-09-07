"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("DailyReport", "otherFavorites", {
      type: Sequelize.STRING, // Store a comma-separated list of item IDs
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("DailyReport", "otherFavorites");
  },
};
