"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Cafe", "xposition", {
      type: Sequelize.DECIMAL(10, 2), // Decimal with 10 digits total and 2 decimal places
      allowNull: true,
    });
    await queryInterface.changeColumn("Cafe", "yposition", {
      type: Sequelize.DECIMAL(10, 2), // Decimal with 10 digits total and 2 decimal places
      allowNull: true,
    });
    await queryInterface.changeColumn("Cafe", "scale", {
      type: Sequelize.DECIMAL(10, 2), // Decimal with 10 digits total and 2 decimal places
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Cafe", "xposition", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn("Cafe", "yposition", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn("Cafe", "scale", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
