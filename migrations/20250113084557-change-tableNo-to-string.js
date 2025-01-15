"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Table", "tableNo", {
      type: Sequelize.STRING,
      allowNull: true, // Ensure this matches your model's configuration
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Table", "tableNo", {
      type: Sequelize.INTEGER,
      allowNull: true, // Rollback to the original configuration
    });
  },
};
