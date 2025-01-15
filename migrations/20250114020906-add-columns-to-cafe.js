"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Cafe');

    if (!tableDescription.fontsize) {
      await queryInterface.addColumn('Cafe', 'fontsize', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 31.25, // Default value for fontsize
      });
    }

    if (!tableDescription.fontcolor) {
      await queryInterface.addColumn('Cafe', 'fontcolor', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '#FFFFFF', // Default value for fontcolor
      });
    }

    if (!tableDescription.fontxposition) {
      await queryInterface.addColumn('Cafe', 'fontxposition', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 5.50, // Default value for fontxposition
      });
    }

    if (!tableDescription.fontyposition) {
      await queryInterface.addColumn('Cafe', 'fontyposition', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 68.00, // Default value for fontyposition
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Cafe');

    if (tableDescription.fontsize) {
      await queryInterface.removeColumn('Cafe', 'fontsize');
    }

    if (tableDescription.fontcolor) {
      await queryInterface.removeColumn('Cafe', 'fontcolor');
    }

    if (tableDescription.fontxposition) {
      await queryInterface.removeColumn('Cafe', 'fontxposition');
    }

    if (tableDescription.fontyposition) {
      await queryInterface.removeColumn('Cafe', 'fontyposition');
    }
  },
};
