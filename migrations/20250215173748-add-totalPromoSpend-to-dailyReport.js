'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('DailyReport', 'totalPromoSpend', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DailyReport', 'totalPromoSpend');
  }
};