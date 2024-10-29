'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('DailyReport', 'favoriteItemId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Ensure it allows nulls
      references: {
        model: 'Item',
        key: 'itemId',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('DailyReport', 'favoriteItemId', {
      type: Sequelize.INTEGER,
      allowNull: false, // Optionally, set it back to NOT NULL if needed
      references: {
        model: 'Item',
        key: 'itemId',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
};
