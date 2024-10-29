'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Transaction', 'payment_type', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('Transaction', 'is_paid', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transaction', 'payment_type');
    await queryInterface.removeColumn('Transaction', 'is_paid');
  }
};
