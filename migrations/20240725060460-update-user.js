"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("User", "email", {
      type: Sequelize.STRING,
      allowNull: true, // Allow NULL values
      unique: true, // Remove the unique constraint
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("User", "email", {
      type: Sequelize.STRING,
      allowNull: false, // Revert to not allowing NULL values
      unique: true, // Reapply the unique constraint
    });
  },
};
