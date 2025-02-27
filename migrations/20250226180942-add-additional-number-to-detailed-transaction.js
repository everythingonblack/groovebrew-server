'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('DetailedTransaction', 'additionalNumber', {
      type: Sequelize.INTEGER,
      defaultValue: 0,  // Default value set to 0
      allowNull: true  // Can be null, or set allowNull: false if required
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DetailedTransaction', 'additionalNumber');
  }
};
