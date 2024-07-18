'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Item', 'price', {
      type: Sequelize.INTEGER,
      allowNull: true,
      default: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Item', 'price');
  }
};
