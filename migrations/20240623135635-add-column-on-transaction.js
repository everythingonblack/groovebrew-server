'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Transaction', 'user_email', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Cafe', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('ItemType', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transaction', 'user_email');
    await queryInterface.removeColumn('Cafe', 'image');
    await queryInterface.removeColumn('ItemType', 'image');
  }
};
