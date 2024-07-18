'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DetailedTransaction', {
      detailedTransactionId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      transactionId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Transaction',
          key: 'transactionId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      itemId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Item',
          key: 'itemId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      qty: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('DetailedTransaction');
  }
};
