'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change the column `date` from DATEONLY to TIMESTAMP
    await queryInterface.changeColumn('DailyReport', 'date', {
      type: Sequelize.DATE, // TIMESTAMP type will include date and time
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // If rolling back the migration, change the column back to DATEONLY
    await queryInterface.changeColumn('DailyReport', 'date', {
      type: Sequelize.DATEONLY, // Only date, no time
      allowNull: false,
    });
  }
};
