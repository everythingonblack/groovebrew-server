'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Transaction', 'cafeId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Cafe',
        key: 'cafeId'
      },
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transaction', 'cafeId');
  }
};
