"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Table", "xposition", {
      type: Sequelize.INTEGER,
      allowNull: true, // Change to true to allow null values
    });

    await queryInterface.changeColumn("Table", "yposition", {
      type: Sequelize.INTEGER,
      allowNull: true, // Change to true to allow null values
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Table", "xposition", {
      type: Sequelize.INTEGER,
      allowNull: false, // Revert back to false in the down migration
    });

    await queryInterface.changeColumn("Table", "yposition", {
      type: Sequelize.INTEGER,
      allowNull: false, // Revert back to false in the down migration
    });
  },
};
