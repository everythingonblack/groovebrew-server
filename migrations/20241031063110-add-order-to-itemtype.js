'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ItemType', 'order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0, // Set a default value as needed
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ItemType', 'order');
  },
};
