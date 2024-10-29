"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Material", "stock");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Material", "stock", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0, // Set the default value if needed
    });
  },
};
