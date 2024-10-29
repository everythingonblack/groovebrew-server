"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Item", "stock");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Item", "stock", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
