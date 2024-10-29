'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transaction', 'stock');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Transaction', 'stock', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
