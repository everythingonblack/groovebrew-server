'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Cafe', 'timezone', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Asia/Jakarta",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Cafe', 'timezone');
  }
};
