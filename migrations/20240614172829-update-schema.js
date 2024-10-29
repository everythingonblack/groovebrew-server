'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('User', 'cafeId', {
      type: Sequelize.STRING,
      allowNull: true,
      references: {
        model: 'Cafe',
        key: 'cafeId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('User', 'cafeId');
  }
};
