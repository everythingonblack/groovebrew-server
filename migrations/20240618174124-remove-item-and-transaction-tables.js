'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop Transaction table
    await queryInterface.dropTable('Transaction');

    // Drop Item table
    await queryInterface.dropTable('Item');

  },

  down: async (queryInterface, Sequelize) => {
    // Drop Transaction table
    await queryInterface.dropTable('Transaction');

    // Drop Item table
    await queryInterface.dropTable('Item');
  }
};
