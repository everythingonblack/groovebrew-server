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
          model: 'Users',
          key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      user_email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      clerkId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      tableId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Tables',
          key: 'tableId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true
      },
      cafeId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Cafes',
          key: 'cafeId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

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
        onDelete: 'CASCADE',
        allowNull: false
      },
      itemId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Items',
          key: 'itemId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: false
      },
      qty: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Transaction');
    await queryInterface.dropTable('DetailedTransaction');
  }
};
