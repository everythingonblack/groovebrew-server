'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('DetailedTransaction', 'price', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true  // Changed to true
    });
    await queryInterface.addColumn('DetailedTransaction', 'promoPrice', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true  // Changed to true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DetailedTransaction', 'price');
    await queryInterface.removeColumn('DetailedTransaction', 'promoPrice');
  }
};
