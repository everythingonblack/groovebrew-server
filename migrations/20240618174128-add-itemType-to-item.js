'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Item', 'itemTypeId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'ItemType',
        key: 'itemTypeId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Item', 'itemTypeId');
  }
};
