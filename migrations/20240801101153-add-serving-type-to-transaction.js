"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Transaction", "serving_type", {
      type: Sequelize.STRING,
      allowNull: true, // or false if you want it to be required
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Transaction", "serving_type");
  },
};
