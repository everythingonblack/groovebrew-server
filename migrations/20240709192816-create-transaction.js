'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Transaction', {
      transactionId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'userId'
        }
      },
      user_email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      clerkId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'User',
          key: 'userId'
        }
      },
      tableId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Table',
          key: 'tableId'
        },
        allowNull: true
      },
      cafeId: {
        type: Sequelize.STRING,
        references: {
          model: 'Cafe',
          key: 'cafeId'
        },
        allowNull: false
      },
      payment_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_paid: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.dropTable('Transaction');
  }
};
