"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Cafe", "welcomePageConfig", {
      type: Sequelize.TEXT, // Using TEXT to store JSON string
      allowNull: true, // Set to true or false based on your requirements
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Cafe", "welcomePageConfig");
  },
};
