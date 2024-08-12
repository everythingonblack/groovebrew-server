// migrations/XXXXXX-add-payment-claimed-to-transaction.js
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Transaction", "paymentClaimed", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Transaction", "paymentClaimed");
  },
};
