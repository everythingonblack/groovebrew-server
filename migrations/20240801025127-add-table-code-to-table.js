"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Table", "tableCode", {
      type: Sequelize.STRING,
      allowNull: true, // Change to false if the column should not be nullable
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Table", "tableCode");
  },
};
