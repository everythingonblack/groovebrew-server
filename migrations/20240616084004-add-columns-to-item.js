'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Item', 'name', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.addColumn('Item', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Item', 'image', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Item', 'name');
    await queryInterface.removeColumn('Item', 'description');
    await queryInterface.removeColumn('Item', 'image');
  }
};
