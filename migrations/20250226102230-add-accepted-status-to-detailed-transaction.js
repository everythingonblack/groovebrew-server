'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('DetailedTransaction', 'acceptedStatus', {
      type: Sequelize.INTEGER,
      allowNull: true,  // Optional column (can be null)
      defaultValue: 0  // Default value set to 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DetailedTransaction', 'acceptedStatus');
  }
};
