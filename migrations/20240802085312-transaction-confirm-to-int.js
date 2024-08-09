"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Remove the existing 'confirmed' column
    await queryInterface.removeColumn("Transaction", "confirmed");

    // Step 2: Add a new 'confirmed' column with INTEGER type
    await queryInterface.addColumn("Transaction", "confirmed", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Step 1: Remove the 'confirmed' column with INTEGER type
    await queryInterface.removeColumn("Transaction", "confirmed");

    // Step 2: Add the original 'confirmed' column with BOOLEAN type
    await queryInterface.addColumn("Transaction", "confirmed", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
  },
};
