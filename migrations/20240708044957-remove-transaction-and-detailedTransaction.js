'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DetailedTransaction');
    await queryInterface.dropTable('Transaction');
  },

  down: async (queryInterface, Sequelize) => {
  }
};
