'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Cafe', 'fontsize', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 31.25, // Default value for fontsize
    });
    await queryInterface.addColumn('Cafe', 'fontcolor', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '#FFFFFF', // Default value for fontfamily
    });
    await queryInterface.addColumn('Cafe', 'fontxposition', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 5.50, // Default value for fontxposition
    });
    await queryInterface.addColumn('Cafe', 'fontyposition', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 68.00, // Default value for fontyposition
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Cafe', 'fontsize');
    await queryInterface.removeColumn('Cafe', 'fontfamily');
    await queryInterface.removeColumn('Cafe', 'fontxposition');
    await queryInterface.removeColumn('Cafe', 'fontyposition');
  },
};
