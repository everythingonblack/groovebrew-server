'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the materialsPurchased column
    await queryInterface.addColumn('DailyReport', 'materialsPurchased', {
      type: Sequelize.JSON,
      allowNull: true, // Change to false if you want it to be mandatory
    });

    // Update itemsSold to allow null values
    await queryInterface.changeColumn('DailyReport', 'itemsSold', {
      type: Sequelize.JSON,
      allowNull: true, // Now itemsSold can be nullable
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert itemsSold to not allow null values
    await queryInterface.changeColumn('DailyReport', 'itemsSold', {
      type: Sequelize.JSON,
      allowNull: false, // Revert to not nullable
    });

    // Remove the materialsPurchased column
    await queryInterface.removeColumn('DailyReport', 'materialsPurchased');
  }
};
